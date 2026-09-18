import { getDriveAccessToken } from "./client";

/**
 * Server-side half of Drive's resumable upload protocol. The browser
 * never talks to Google: it sends ≤4MB chunks to our own route, which
 * relays them here — so files stay private (no public link, no token in
 * the browser) and no single request exceeds the host's body limit.
 */
const UPLOAD_BASE = process.env.GOOGLE_UPLOAD_BASE_URL ?? "https://www.googleapis.com";

export interface DriveUploadedFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}

export type ChunkResult =
  | { done: false; nextOffset: number }
  | { done: true; file: DriveUploadedFile };

/** Starts a resumable session; returns the session URI. */
export async function createResumableSession(opts: {
  name: string;
  mimeType: string;
  size: number;
  folderId: string;
}): Promise<string> {
  const res = await fetch(
    `${UPLOAD_BASE}/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await getDriveAccessToken()}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": opts.mimeType,
        "X-Upload-Content-Length": String(opts.size),
      },
      body: JSON.stringify({ name: opts.name, parents: [opts.folderId] }),
    },
  );
  const location = res.headers.get("location");
  if (!res.ok || !location) {
    throw new Error(`تعذر بدء الرفع (${res.status})`);
  }
  return location;
}

async function readResult(res: Response): Promise<ChunkResult> {
  if (res.status === 308) {
    const range = res.headers.get("range"); // "bytes=0-4194303" (absent = nothing yet)
    const last = range ? Number(range.split("-")[1]) : -1;
    return { done: false, nextOffset: Number.isFinite(last) ? last + 1 : 0 };
  }
  if (res.status === 200 || res.status === 201) {
    const json = (await res.json()) as {
      id: string;
      name: string;
      mimeType: string;
      size?: string;
    };
    return {
      done: true,
      file: {
        id: json.id,
        name: json.name,
        mimeType: json.mimeType,
        size: Number(json.size ?? 0),
      },
    };
  }
  throw new Error(`فشل رفع الملف (${res.status})`);
}

/** Sends one chunk that starts at byte `start` of a `total`-byte file. */
export async function putChunk(
  sessionUri: string,
  start: number,
  chunk: Uint8Array,
  total: number,
): Promise<ChunkResult> {
  const end = start + chunk.length - 1;
  const res = await fetch(sessionUri, {
    method: "PUT",
    redirect: "manual",
    headers: {
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Content-Type": "application/octet-stream",
    },
    body: chunk as unknown as BodyInit,
  });
  return readResult(res);
}

/** Asks Drive how much of the file it already has (to resume after a drop). */
export async function queryUploadedOffset(
  sessionUri: string,
  total: number,
): Promise<ChunkResult> {
  const res = await fetch(sessionUri, {
    method: "PUT",
    redirect: "manual",
    headers: { "Content-Range": `bytes */${total}` },
  });
  return readResult(res);
}
