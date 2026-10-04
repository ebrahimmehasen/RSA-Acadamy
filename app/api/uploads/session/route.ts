import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, toErrorResponse } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateFolder } from "@/lib/googleDrive/folders";
import { createResumableSession } from "@/lib/googleDrive/resumable";
import { UPLOAD_RULES, registerFile } from "@/lib/googleDrive/upload";
import { DIRECT_CHUNK_BYTES, directUploadOrigin } from "@/lib/directUpload";
import { relayChunk, relayStatus } from "@/lib/chunkRelay";
import { SUBMISSION_LIMITS } from "@/lib/uploadLimits";
import {
  signUploadSession,
  verifyUploadSession,
  type UploadSessionPayload,
} from "@/lib/uploadSession";

/**
 * Chunked upload of a teacher's recorded-session video — same protocol as
 * /api/uploads/submission (POST init → PUT chunks / direct-to-Drive → GET
 * confirm). The recorded_sessions row is created only when Drive holds the
 * whole video, so an abandoned upload leaves nothing behind.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const initSchema = z.object({
  classId: z.number().int().positive(),
  subjectId: z.string().min(1),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).default(""),
  isPublic: z.boolean(),
  accessibleStudents: z.array(z.number().int().positive()).max(300).default([]),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().min(1).max(150),
  size: z.number().int().positive(),
});

const fail = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function POST(request: Request) {
  try {
    const session = await requireRole("teacher");
    const parsed = initSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail("بيانات الحصة غير صحيحة");
    const d = parsed.data;

    const rules = UPLOAD_RULES.session;
    if (!(rules.mimes as readonly string[]).includes(d.mimeType)) {
      return fail(`${d.fileName}: نوع الملف غير مسموح به`);
    }
    if (d.size > rules.maxBytes) {
      return fail(`${d.fileName}: الملف أكبر من الحد الأقصى المسموح به`);
    }

    const supabase = createAdminClient();
    const teacherId = session.profile.id;

    // the teacher must actually teach this class+subject
    const { count } = await supabase
      .from("class_assignments")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", teacherId)
      .eq("class_id", d.classId)
      .eq("subject_id", d.subjectId)
      .eq("is_active", true);
    if (!count) return fail("أنت لا تُدرِّس هذه المادة لهذا الفصل", 403);

    const { data: subject } = await supabase
      .from("subjects")
      .select("subject_name")
      .eq("subject_id", d.subjectId)
      .single();
    const folderId = await getOrCreateFolder(
      `Recorded_Sessions/${(subject?.subject_name ?? "General").replace(/[/\\]/g, "-")}`,
    );

    const origin = directUploadOrigin(request);
    const sessionUri = await createResumableSession({
      name: `Session_${Date.now()}_${d.fileName}`,
      mimeType: d.mimeType,
      size: d.size,
      folderId,
      origin: origin ?? undefined,
    });

    const token = signUploadSession({
      u: teacherId,
      k: "session",
      a: 0,
      s: sessionUri,
      t: d.size,
      n: d.fileName,
      m: d.mimeType,
      x: {
        c: d.classId,
        sj: d.subjectId,
        ti: d.title,
        d: d.description,
        p: d.isPublic,
        st: d.isPublic ? [] : d.accessibleStudents,
      },
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
  const session = await requireRole("teacher");
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const payload = verifyUploadSession(token);
  if (!payload || payload.u !== session.profile.id) return null;
  if (payload.k !== "session" || !payload.x) return null;
  return payload;
}

/** Creates the session row + registry entry once Drive has the video (idempotent). */
async function finalizeUpload(payload: UploadSessionPayload, driveFileId: string) {
  const supabase = createAdminClient();
  const x = payload.x!;
  const { data: existing } = await supabase
    .from("recorded_sessions")
    .select("id")
    .eq("video_drive_id", driveFileId)
    .maybeSingle();
  if (!existing) {
    const { data: created, error } = await supabase
      .from("recorded_sessions")
      .insert({
        class_id: x.c,
        subject_id: x.sj,
        teacher_id: payload.u,
        uploaded_by: payload.u,
        title: x.ti,
        description: x.d || null,
        video_drive_id: driveFileId,
        video_size: payload.t,
        is_public: x.p,
        accessible_to_students: x.p ? [] : x.st,
      })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "تعذر حفظ الحصة");
    await registerFile({
      driveFileId,
      fileName: payload.n,
      mimeType: payload.m,
      sizeBytes: payload.t,
      entityType: "session",
      entityId: String(created.id),
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
