import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, toErrorResponse } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateFolder } from "@/lib/googleDrive/folders";
import { createResumableSession } from "@/lib/googleDrive/resumable";
import { registerFile } from "@/lib/googleDrive/upload";
import { relayChunk, relayStatus } from "@/lib/chunkRelay";
import {
  ASSIGNMENT_ATTACHMENT_LIMITS,
  TEACHER_ATTACHMENT_ALLOWED_MIMES,
  TEACHER_UPLOAD_CHUNK_BYTES,
  validateAssignmentAttachmentBatch,
} from "@/lib/uploadLimits";
import { pendingTeacherEntityId, teacherAttachmentUsage } from "@/lib/teacherAttachments";
import {
  signUploadSession,
  verifyUploadSession,
  type UploadSessionPayload,
} from "@/lib/uploadSession";

/**
 * Chunked upload of a teacher's assignment attachments — same protocol as
 * /api/uploads/submission. Files are recorded as `pending:<teacherId>`
 * until createAssignment/updateAssignment attaches them to an assignment.
 *   POST {fileName, mimeType, size, assignmentId?}  (assignmentId = editing an existing one)
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const initSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().min(1).max(150),
  size: z.number().int().positive(),
  assignmentId: z.number().int().positive().nullable().optional(),
});

const fail = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function POST(request: Request) {
  try {
    const session = await requireRole("teacher");
    const parsed = initSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail("بيانات الملف غير صحيحة");
    const { fileName, mimeType, size } = parsed.data;
    const assignmentId = parsed.data.assignmentId ?? null;

    if (!(TEACHER_ATTACHMENT_ALLOWED_MIMES as readonly string[]).includes(mimeType)) {
      return fail(`${fileName}: نوع الملف غير مسموح به`);
    }
    if (size > ASSIGNMENT_ATTACHMENT_LIMITS.maxTotalBytes) {
      return fail(`${fileName}: الملف أكبر من الحد الأقصى المسموح به`);
    }

    const supabase = createAdminClient();
    const teacherId = session.profile.id;

    if (assignmentId != null) {
      const { data: assignment } = await supabase
        .from("assignments")
        .select("teacher_id, due_date")
        .eq("id", assignmentId)
        .maybeSingle();
      if (!assignment || assignment.teacher_id !== teacherId) {
        return fail("لا يمكنك تعديل واجب ليس واجبك", 403);
      }
      if (new Date(assignment.due_date) <= new Date()) {
        return fail("لا يمكن تعديل الواجب بعد انتهاء الموعد", 403);
      }
    }

    const usage = await teacherAttachmentUsage(supabase, teacherId, assignmentId);
    const limitError = validateAssignmentAttachmentBatch(usage.count, usage.bytes, [{ size }]);
    if (limitError) return fail(limitError);

    const folderId = await getOrCreateFolder("Assignment_Files/Teacher_Attachments");
    const sessionUri = await createResumableSession({
      name: `Attachment_${assignmentId ?? "new"}_${fileName}`,
      mimeType,
      size,
      folderId,
    });

    const token = signUploadSession({
      u: teacherId,
      k: "teacher",
      a: assignmentId ?? 0,
      s: sessionUri,
      t: size,
      n: fileName,
      m: mimeType,
      e: Date.now() + 24 * 60 * 60 * 1000,
    });
    return NextResponse.json({ token, chunkBytes: TEACHER_UPLOAD_CHUNK_BYTES });
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function authorize(request: Request) {
  const session = await requireRole("teacher");
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const payload = verifyUploadSession(token);
  if (!payload || payload.u !== session.profile.id || payload.k !== "teacher") return null;
  return payload;
}

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
      entityType: "teacher_attachment",
      entityId: pendingTeacherEntityId(payload.u),
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
