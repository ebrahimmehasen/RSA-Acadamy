import { NextResponse } from "next/server";
import { putChunk, queryUploadedOffset } from "@/lib/googleDrive/resumable";
import { SUBMISSION_LIMITS } from "@/lib/uploadLimits";
import type { UploadSessionPayload } from "@/lib/uploadSession";

export interface FinishedUpload {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

type Finalize = (
  payload: UploadSessionPayload,
  driveFileId: string,
) => Promise<FinishedUpload>;

const fail = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

/**
 * The chunk-relay half shared by every chunked upload route (student
 * answers, teacher attachments): validates one ≤4MiB chunk against the
 * signed session, forwards it to Drive, and — once Drive has the whole
 * file — lets the route record it via `finalize`.
 */
export async function relayChunk(
  request: Request,
  payload: UploadSessionPayload,
  finalize: Finalize,
): Promise<Response> {
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
  return NextResponse.json({ done: true, file: await finalize(payload, result.file.id) });
}

/** Resume support: how much of the file does Drive already hold? */
export async function relayStatus(
  payload: UploadSessionPayload,
  finalize: Finalize,
): Promise<Response> {
  const result = await queryUploadedOffset(payload.s, payload.t);
  if (!result.done) return NextResponse.json(result);
  return NextResponse.json({ done: true, file: await finalize(payload, result.file.id) });
}
