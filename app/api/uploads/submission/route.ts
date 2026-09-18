import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, toErrorResponse } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateFolder } from "@/lib/googleDrive/folders";
import {
  createResumableSession,
  putChunk,
  queryUploadedOffset,
} from "@/lib/googleDrive/resumable";
import { registerFile } from "@/lib/googleDrive/upload";
import {
  SUBMISSION_ALLOWED_MIMES,
  SUBMISSION_LIMITS,
  validateSubmissionBatch,
} from "@/lib/uploadLimits";
import {
  checkStudentCanSubmit,
  studentAssignmentUsage,
  submissionFilesOf,
} from "@/lib/submissions";
import { signUploadSession, verifyUploadSession } from "@/lib/uploadSession";

/**
 * Chunked upload of a student's answer files.
 *   POST  {assignmentId, fileName, mimeType, size}  → {token}   (validates + opens a Drive session)
 *   PUT   ?token&offset  (raw bytes ≤ chunkBytes)   → {done:false,nextOffset} | {done:true,file}
 *   GET   ?token                                    → same shape (resume: how much does Drive have)
 * The browser only ever talks to this route; Drive credentials and the
 * session URI stay server-side.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const initSchema = z.object({
  assignmentId: z.number().int().positive(),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().min(1).max(150),
  size: z.number().int().positive(),
});

const fail = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function POST(request: Request) {
  try {
    const session = await requireRole("student");
    const parsed = initSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail("بيانات الملف غير صحيحة");
    const { assignmentId, fileName, mimeType, size } = parsed.data;

    if (!(SUBMISSION_ALLOWED_MIMES as readonly string[]).includes(mimeType)) {
      return fail(`${fileName}: نوع الملف غير مسموح به`);
    }
    if (size > SUBMISSION_LIMITS.maxTotalBytes) {
      return fail(`${fileName}: الملف أكبر من الحد الأقصى المسموح به`);
    }

    const supabase = createAdminClient();
    const studentId = session.profile.id;

    const eligible = await checkStudentCanSubmit(supabase, studentId, assignmentId);
    if (!eligible.ok) return fail(eligible.message, 403);
    if (!eligible.assignment.allow_file) {
      return fail("هذا الواجب لا يقبل الملفات — يرجى كتابة إجابة نصية", 403);
    }

    const { data: existing } = await supabase
      .from("assignment_submissions")
      .select("status, files, file_drive_id, file_name")
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentId)
      .maybeSingle();
    if (existing?.status === "graded") {
      return fail("تم تصحيح هذا الواجب بالفعل — لا يمكن تعديل التسليم", 403);
    }

    const usage = await studentAssignmentUsage(
      supabase,
      studentId,
      assignmentId,
      existing ? submissionFilesOf(existing).map((f) => f.id) : [],
    );
    const limitError = validateSubmissionBatch(usage.count, usage.bytes, [{ size }]);
    if (limitError) return fail(limitError);

    const folderId = await getOrCreateFolder(
      `Assignment_Files/Student_Submissions/${studentId}`,
    );
    const sessionUri = await createResumableSession({
      name: `Assignment_${assignmentId}_${fileName}`,
      mimeType,
      size,
      folderId,
    });

    const token = signUploadSession({
      u: studentId,
      a: assignmentId,
      s: sessionUri,
      t: size,
      n: fileName,
      m: mimeType,
      e: Date.now() + 24 * 60 * 60 * 1000,
    });
    return NextResponse.json({ token, chunkBytes: SUBMISSION_LIMITS.chunkBytes });
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function authorize(request: Request) {
  const session = await requireRole("student");
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const payload = verifyUploadSession(token);
  if (!payload || payload.u !== session.profile.id) return null;
  return payload;
}

/** Records a finished Drive upload in file_storage (idempotent — a resumed upload may finish twice). */
async function finalizeUpload(
  payload: { u: number; a: number; n: string; m: string; t: number },
  driveFileId: string,
) {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("file_storage")
    .select("id")
    .eq("drive_file_id", driveFileId)
    .maybeSingle();
  if (!existing) {
    await registerFile({
      driveFileId,
      fileName: payload.n,
      mimeType: payload.m,
      sizeBytes: payload.t,
      entityType: "assignment",
      entityId: String(payload.a),
      uploadedBy: payload.u,
    });
  }
  return { id: driveFileId, name: payload.n, mimeType: payload.m, sizeBytes: payload.t };
}

export async function PUT(request: Request) {
  try {
    const payload = await authorize(request);
    if (!payload) return fail("جلسة الرفع غير صالحة أو انتهت", 403);

    const offset = Number(new URL(request.url).searchParams.get("offset"));
    if (!Number.isInteger(offset) || offset < 0 || offset >= payload.t) {
      return fail("موضع الرفع غير صحيح");
    }
    const chunk = new Uint8Array(await request.arrayBuffer());
    if (chunk.length === 0 || chunk.length > SUBMISSION_LIMITS.chunkBytes) {
      return fail("حجم الجزء غير صحيح");
    }
    if (offset + chunk.length > payload.t) return fail("الجزء يتجاوز حجم الملف");

    const result = await putChunk(payload.s, offset, chunk, payload.t);
    if (!result.done) return NextResponse.json(result);

    // Finished on Drive — record it (private; served only via /api/files).
    return NextResponse.json({ done: true, file: await finalizeUpload(payload, result.file.id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    const payload = await authorize(request);
    if (!payload) return fail("جلسة الرفع غير صالحة أو انتهت", 403);
    const result = await queryUploadedOffset(payload.s, payload.t);
    if (!result.done) return NextResponse.json(result);
    return NextResponse.json({ done: true, file: await finalizeUpload(payload, result.file.id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
