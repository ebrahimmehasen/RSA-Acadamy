/**
 * Direct browser → Google Drive uploads. Drive's resumable session URI is
 * an unguessable, single-file, write-only capability (it can't read or list
 * anything), so handing it to the browser lets the bytes skip our Vercel
 * functions entirely — which is what burns the "Fast Origin Transfer"
 * quota. Drive only answers CORS for the Origin that opened the session,
 * so the session is opened with the caller's (allow-listed) Origin.
 *
 * Verified against real Drive: preflight succeeds, the 308 response exposes
 * `Range`, and the final 200 body is readable cross-origin.
 */
export const DIRECT_CHUNK_BYTES = 8 * 1024 * 1024; // multiple of Drive's 256KiB granule

/** The request's Origin if direct upload is allowed from it, else null (→ server relay). */
export function directUploadOrigin(request: Request): string | null {
  if (process.env.UPLOAD_DIRECT === "off") return null;
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const allowed = new Set<string>();
  for (const raw of [
    process.env.NEXT_PUBLIC_APP_URL,
    ...(process.env.UPLOAD_ALLOWED_ORIGINS ?? "").split(","),
  ]) {
    const value = raw?.trim();
    if (!value) continue;
    try {
      allowed.add(new URL(value).origin);
    } catch {
      // ignore malformed entries
    }
  }
  return allowed.has(origin) ? origin : null;
}
