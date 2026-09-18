/**
 * Browser-side chunked uploader for a student's answer files. Talks only to
 * our own /api/uploads/submission route (see that file for the protocol).
 * Client-safe: no server imports.
 */
export interface UploadedFileInfo {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
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

const ENDPOINT = "/api/uploads/submission";

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

/**
 * Uploads one file in chunks. Survives dropped connections: on a
 * transient error it asks the server how much Drive already holds and
 * carries on from there instead of restarting the file.
 */
export async function uploadSubmissionFile(
  file: File,
  assignmentId: number,
  onProgress: (uploadedBytes: number) => void,
  opts: UploadOptions = {},
): Promise<UploadedFileInfo> {
  const doFetch = opts.fetchImpl ?? fetch;
  const retries = opts.retries ?? 4;
  const retryDelay = opts.retryDelayMs ?? 1000;
  const { signal } = opts;

  if (file.size <= 0) throw new UploadError(`${file.name}: الملف فارغ`, 400);

  const init = await readJson<{ token: string; chunkBytes: number }>(
    await doFetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignmentId,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      }),
      signal,
    }),
  );
  const url = `${ENDPOINT}?token=${encodeURIComponent(init.token)}`;

  let offset = 0;
  let attempts = 0;
  let stalls = 0;
  for (;;) {
    const blob = file.slice(offset, Math.min(offset + init.chunkBytes, file.size));
    try {
      const res = await readJson<ChunkResponse>(
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
