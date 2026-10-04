/**
 * Browser-side chunked uploader (student answers and teacher attachments).
 * Talks only to our own /api/uploads/* routes (see those files for the
 * protocol). Client-safe: no server imports.
 */
import type { FileKind } from "@/lib/uploads/fileKinds";

export interface UploadedFileInfo {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  /** generic uploads (uploadFile): redeem it in the feature's server action */
  ticket?: string;
}

type ChunkResponse =
  | { done: false; nextOffset: number }
  | { done: true; file: UploadedFileInfo };

export class UploadError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const SUBMISSION_ENDPOINT = "/api/uploads/submission";
const TEACHER_ENDPOINT = "/api/uploads/teacher-attachment";
const SESSION_ENDPOINT = "/api/uploads/session";
const FILE_ENDPOINT = "/api/uploads/file";

async function readJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!res.ok || !body) {
    throw new UploadError(body?.error ?? "فشل رفع الملف", res.status);
  }
  return body;
}

export interface UploadOptions {
  fetchImpl?: typeof fetch;
  /** retries per chunk on network / 5xx errors (default 4) */
  retries?: number;
  retryDelayMs?: number;
  signal?: AbortSignal;
}

/** A student's answer file for an assignment. */
export function uploadSubmissionFile(
  file: File,
  assignmentId: number,
  onProgress: (uploadedBytes: number) => void,
  opts: UploadOptions = {},
): Promise<UploadedFileInfo> {
  return uploadFileChunked(file, SUBMISSION_ENDPOINT, { assignmentId }, onProgress, opts);
}

/** A teacher's assignment attachment (assignmentId when editing an existing one). */
export function uploadTeacherAttachmentFile(
  file: File,
  assignmentId: number | null,
  onProgress: (uploadedBytes: number) => void,
  opts: UploadOptions = {},
): Promise<UploadedFileInfo> {
  return uploadFileChunked(file, TEACHER_ENDPOINT, { assignmentId }, onProgress, opts);
}

/**
 * Any kind registered in lib/uploads/fileKinds.ts. Resolves with a
 * `ticket`; send that (never the File) to the feature's server action.
 */
export async function uploadFile(
  kind: FileKind,
  file: File,
  onProgress: (uploadedBytes: number) => void = () => {},
  opts: UploadOptions = {},
): Promise<UploadedFileInfo & { ticket: string }> {
  const info = await uploadFileChunked(file, FILE_ENDPOINT, { kind }, onProgress, opts);
  if (!info.ticket) throw new UploadError("فشل رفع الملف", 502);
  return { ...info, ticket: info.ticket };
}

export interface SessionVideoDetails {
  classId: number;
  subjectId: string;
  title: string;
  description: string;
  isPublic: boolean;
  accessibleStudents: number[];
}

/** A teacher's recorded session video (the session row is created once the upload completes). */
export function uploadSessionVideo(
  file: File,
  details: SessionVideoDetails,
  onProgress: (uploadedBytes: number) => void,
  opts: UploadOptions = {},
): Promise<UploadedFileInfo> {
  return uploadFileChunked(file, SESSION_ENDPOINT, { ...details }, onProgress, opts);
}

/**
 * One chunk straight to Drive. Drive answers 308 (+ `Range`) until the last
 * byte, then 200; on 200 we ask our own server to confirm with Drive itself
 * and record the file, so a client can never claim a file it didn't upload.
 */
async function putDirect(
  doFetch: typeof fetch,
  directUrl: string,
  blob: Blob,
  offset: number,
  total: number,
  finalizeUrl: string,
  signal?: AbortSignal,
): Promise<ChunkResponse> {
  const res = await doFetch(directUrl, {
    method: "PUT",
    headers: {
      "Content-Range": `bytes ${offset}-${offset + blob.size - 1}/${total}`,
      "Content-Type": "application/octet-stream",
    },
    body: blob,
    signal,
  });
  if (res.status === 308) {
    const range = res.headers.get("range"); // "bytes=0-8388607"
    const last = range ? Number(range.split("-")[1]) : NaN;
    return { done: false, nextOffset: Number.isFinite(last) ? last + 1 : offset };
  }
  if (res.status === 200 || res.status === 201) {
    return readJson<ChunkResponse>(await doFetch(finalizeUrl, { signal }));
  }
  throw new UploadError("فشل رفع الملف", res.status >= 500 ? 502 : res.status);
}

/**
 * Uploads one file in chunks. Survives dropped connections: on a
 * transient error it asks the server how much Drive already holds and
 * carries on from there instead of restarting the file.
 */
async function uploadFileChunked(
  file: File,
  endpoint: string,
  extraInit: Record<string, unknown>,
  onProgress: (uploadedBytes: number) => void,
  opts: UploadOptions = {},
): Promise<UploadedFileInfo> {
  const doFetch = opts.fetchImpl ?? fetch;
  const retries = opts.retries ?? 4;
  const retryDelay = opts.retryDelayMs ?? 1000;
  const { signal } = opts;

  if (file.size <= 0) throw new UploadError(`${file.name}: الملف فارغ`, 400);

  const init = await readJson<{
    token: string;
    chunkBytes: number;
    /** present when the browser may PUT chunks straight to Drive (skips Vercel) */
    direct?: { url: string; chunkBytes: number };
  }>(
    await doFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...extraInit,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      }),
      signal,
    }),
  );
  const url = `${endpoint}?token=${encodeURIComponent(init.token)}`;

  let offset = 0;
  let attempts = 0;
  let stalls = 0;
  let direct = init.direct ?? null;
  for (;;) {
    const chunkBytes = direct ? direct.chunkBytes : init.chunkBytes;
    const blob = file.slice(offset, Math.min(offset + chunkBytes, file.size));
    try {
      const res = direct
        ? await putDirect(doFetch, direct.url, blob, offset, file.size, url, signal)
        : await readJson<ChunkResponse>(
            await doFetch(`${url}&offset=${offset}`, {
              method: "PUT",
              headers: { "Content-Type": "application/octet-stream" },
              body: blob,
              signal,
            }),
          );
      attempts = 0;
      if (res.done) {
        onProgress(file.size);
        return res.file;
      }
      // Drive must move forward; a server that keeps answering the same
      // offset would otherwise spin this loop forever.
      stalls = res.nextOffset <= offset ? stalls + 1 : 0;
      if (stalls >= 3) throw new UploadError("توقف الرفع — حاول مرة أخرى", 502);
      offset = res.nextOffset;
      onProgress(Math.min(offset, file.size));
    } catch (error) {
      // Browser-level failure talking to Drive (CORS / blocked / offline):
      // finish through our relay instead, from wherever Drive got to.
      if (direct && !(error instanceof UploadError) && !signal?.aborted) {
        direct = null;
        attempts = 0;
      }
      const permanent =
        error instanceof UploadError && error.status >= 400 && error.status < 500;
      if (signal?.aborted || permanent || ++attempts > retries) throw error;
      await new Promise((r) => setTimeout(r, retryDelay * attempts));
      try {
        const status = await readJson<ChunkResponse>(await doFetch(url, { signal }));
        if (status.done) {
          onProgress(file.size);
          return status.file;
        }
        offset = status.nextOffset;
      } catch {
        // couldn't resync — just retry the same chunk
      }
    }
  }
}
