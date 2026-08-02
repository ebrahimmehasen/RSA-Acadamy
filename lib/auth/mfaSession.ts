import "server-only";
import crypto from "node:crypto";

const COOKIE_NAME = "mfa_verified";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12h — re-challenge daily-ish

function secretKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY is not set");
  return key;
}

/** value: `${userId}.${expiresAtMs}.${hmac}` */
export function signMfaCookie(userId: string): string {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${userId}.${expiresAt}`;
  const hmac = crypto
    .createHmac("sha256", secretKey())
    .update(payload)
    .digest("hex");
  return `${payload}.${hmac}`;
}

export function verifyMfaCookie(value: string | undefined, userId: string): boolean {
  if (!value) return false;
  const [uid, expiresAtRaw, hmac] = value.split(".");
  if (!uid || !expiresAtRaw || !hmac) return false;
  if (uid !== userId) return false;
  if (Date.now() > Number(expiresAtRaw)) return false;

  const expected = crypto
    .createHmac("sha256", secretKey())
    .update(`${uid}.${expiresAtRaw}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
}

export const MFA_COOKIE_NAME = COOKIE_NAME;
export const MFA_COOKIE_MAX_AGE = MAX_AGE_SECONDS;
