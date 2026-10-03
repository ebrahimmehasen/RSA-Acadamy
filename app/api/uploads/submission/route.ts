import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, toErrorResponse } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateFolder } from "@/lib/googleDrive/folders";
import { createResumableSession } from "@/lib/googleDrive/resumable";
import { registerFile } from "@/lib/googleDrive/upload";
import { DIRECT_CHUNK_BYTES, directUploadOrigin } from "@/lib/directUpload";
import { relayChunk, relayStatus } from "@/lib/chunkRelay";
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
import {
  signUploadSession,
  verifyUploadSession,
  type UploadSessionPayload,
} from "@/lib/uploadSession";

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
    const origin = directUploadOrigin(request);
    const sessionUri = await createResumableSession({
      name: `Assignment_${assignmentId}_${fileName}`,
      mimeType,
      size,
      folderId,
      origin: origin ?? undefined,
    });

    const token = signUploadSession({
      u: studentId,
      k: "submission",
      a: assignmentId,
      s: sessionUri,
      t: size,
      n: fileName,
      m: mimeType,
      e: Date.now() + 24 * 60 * 60 * 1000,
    });
    return NextResponse.json(
      origin
        ? {
            token,
            chunkBytes: SUBMISSION_LIMITS.chunkBytes,
            direct: { url: sessionUri, chunkBytes: DIRECT_CHUNK_BYTES },
          }
        : { token, chunkBytes: SUBMISSION_LIMITS.chunkBytes },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function authorize(request: Request) {
  const session = await requireRole("student");
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const payload = verifyUploadSession(token);
  if (!payload || payload.u !== session.profile.id) return null;
  if ((payload.k ?? "submission") !== "submission") return null;
  return payload;
}

/** Records a finished Drive upload in file_storage (idempotent — a resumed upload may finish twice). */
async function finalizeUpload(payload: UploadSessionPayload, driveFileId: string) {
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
    return await relayChunk(request, payload, finalizeUpload);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    const payload = await authorize(request);
    if (!payload) return fail("جلسة الرفع غير صالحة أو انتهت", 403);
    return await relayStatus(payload, finalizeUpload);
  } catch (error) {
    return toErrorResponse(error);
  }
}
