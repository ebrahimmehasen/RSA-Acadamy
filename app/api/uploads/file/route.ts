import { NextResponse } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateFolder } from "@/lib/googleDrive/folders";
import { createResumableSession } from "@/lib/googleDrive/resumable";
import { registerFile, validateUpload } from "@/lib/googleDrive/upload";
import { DIRECT_CHUNK_BYTES, directUploadOrigin } from "@/lib/directUpload";
import { relayChunk, relayStatus } from "@/lib/chunkRelay";
import { SUBMISSION_LIMITS } from "@/lib/uploadLimits";
import { checkAuthRateLimit } from "@/lib/rateLimit/upstash";
import { FILE_KINDS, isFileKind, type FileKind } from "@/lib/uploads/fileKinds";
import { signFileTicket } from "@/lib/uploads/ticket";
import {
  signUploadSession,
  verifyUploadSession,
  type UploadSessionPayload,
} from "@/lib/uploadSession";

/**
 * Generic upload for every kind in lib/uploads/fileKinds.ts — same
 * protocol as the other /api/uploads/* routes:
 *   POST {kind, fileName, mimeType, size} → {token, chunkBytes, direct?}
 *   PUT  ?token&offset (relay fallback)   GET ?token (confirm with Drive)
 * When Drive holds the whole file the response's `file.ticket` is what the
 * feature's server action redeems (lib/uploads/ticket.ts).
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const initSchema = z.object({
  kind: z.string(),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().min(1).max(150),
  size: z.number().int().positive(),
});

const fail = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function POST(request: Request) {
  try {
    const parsed = initSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || !isFileKind(parsed.data.kind)) return fail("بيانات الملف غير صحيحة");
    const { fileName, mimeType, size } = parsed.data;
    const kind: FileKind = parsed.data.kind;
    const spec = FILE_KINDS[kind];

    const session = await getSession();
    if (!session) {
      if (spec.roles !== "anonymous") return fail("يجب تسجيل الدخول", 401);
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
      const { allowed } = await checkAuthRateLimit(`upload:${ip}`);
      if (!allowed) return fail("محاولات كثيرة — انتظر دقيقة ثم حاول مرة أخرى", 429);
    } else if (spec.roles !== "anonymous" && !(spec.roles as readonly string[]).includes(session.profile.role)) {
      return fail("غير مسموح", 403);
    }

    const ruleError = validateUpload(spec.rule, mimeType, size);
    if (ruleError) return fail(`${fileName}: ${ruleError}`);

    const role = session?.profile.role ?? null;
    const folderId = await getOrCreateFolder(spec.folder(role));
    const origin = directUploadOrigin(request);
    const uploaderId = session?.profile.id ?? 0;
    const sessionUri = await createResumableSession({
      name: `${kind}_${uploaderId || "signup"}_${Date.now()}_${fileName}`,
      mimeType,
      size,
      folderId,
      origin: origin ?? undefined,
    });

    const token = signUploadSession({
      u: uploaderId,
      k: "file",
      fk: kind,
      a: 0,
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
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const payload = verifyUploadSession(token);
  if (!payload || payload.k !== "file" || !isFileKind(payload.fk)) return null;
  // signed-in uploads stay bound to their user; signup uploads (u = 0) are
  // bound to the token itself
  if (payload.u !== 0) {
    const session = await getSession();
    if (session?.profile.id !== payload.u) return null;
  }
  return payload;
}

/** Records the finished file as "pending" until its feature redeems the ticket (idempotent). */
async function finalizeUpload(payload: UploadSessionPayload, driveFileId: string) {
  const kind = payload.fk as FileKind;
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
      entityType: FILE_KINDS[kind].rule,
      entityId: "pending",
      uploadedBy: payload.u || null,
    });
  }
  return {
    id: driveFileId,
    name: payload.n,
    mimeType: payload.m,
    sizeBytes: payload.t,
    ticket: signFileTicket({ f: driveFileId, k: kind, u: payload.u, n: payload.n, m: payload.m, t: payload.t }),
  };
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
