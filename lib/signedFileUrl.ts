import { createHmac } from "node:crypto";

/**
 * URL for a private Drive file.
 *
 * When FILES_WORKER_URL + FILES_SIGNING_SECRET are set, this is a
 * short-lived HMAC-signed link served by the Cloudflare Worker in
 * workers/files-proxy — the bytes then never pass through Vercel (which is
 * what burns the Fast Origin Transfer quota). Otherwise it falls back to the
 * authenticated /api/files/[id] proxy, so nothing breaks before the Worker
 * is configured.
 *
 * Call this only AFTER the caller has been authorised to see the file: the
 * link itself is the capability. Expiry is bucketed to the day so the same
 * file gets the same URL all day (browser cache hits instead of refetches)
 * and every link lives 24–48h.
 */
const DAY_S = 24 * 3600;

export function workerBase(): string | null {
  const base = process.env.FILES_WORKER_URL?.trim().replace(/\/+$/, "");
  return base && process.env.FILES_SIGNING_SECRET ? base : null;
}

/**
 * Optional second Worker origin (FILES_WORKER_URL_ALT): the same Worker code
 * and signing secret behind another hostname, tried before the Vercel proxy
 * when the primary host can't be reached. null when unset or not a different origin.
 */
export function workerAltOrigin(): string | null {
  const raw = process.env.FILES_WORKER_URL_ALT?.trim();
  const primary = workerBase();
  if (!raw || !primary) return null;
  try {
    const origin = new URL(raw).origin;
    return origin === new URL(primary).origin ? null : origin;
  } catch {
    return null;
  }
}

export function signFileId(id: string, exp: number): string {
  return createHmac("sha256", process.env.FILES_SIGNING_SECRET ?? "")
    .update(`${id}.${exp}`)
    .digest("base64url");
}

export function fileUrl(driveFileId: string, now: number = Date.now()): string {
  const base = workerBase();
  if (!base || !/^[\w-]+$/.test(driveFileId)) return `/api/files/${driveFileId}`;
  const exp = (Math.floor(now / 1000 / DAY_S) + 2) * DAY_S;
  return `${base}/f/${driveFileId}?e=${exp}&s=${signFileId(driveFileId, exp)}`;
}
