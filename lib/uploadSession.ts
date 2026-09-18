import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed, expiring handle for one in-progress chunked upload. It binds the
 * Drive session URI to the student, assignment, file name/type and total
 * size that were validated when the upload started, so the chunk endpoint
 * never has to trust the browser about any of them.
 */
export interface UploadSessionPayload {
  /** student profile id */
  u: number;
  /** assignment id */
  a: number;
  /** Drive resumable session URI */
  s: string;
  /** total bytes */
  t: number;
  /** original file name */
  n: string;
  /** mime type */
  m: string;
  /** expiry (ms epoch) */
  e: number;
}

function secret(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("server secret is not configured");
  return key;
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function signUploadSession(payload: UploadSessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyUploadSession(token: string): UploadSessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as UploadSessionPayload;
    if (typeof payload.e !== "number" || payload.e < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
