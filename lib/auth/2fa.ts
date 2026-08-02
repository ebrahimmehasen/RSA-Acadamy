import "server-only";
import crypto from "node:crypto";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";

export function generateSecret(email: string) {
  const secret = speakeasy.generateSecret({
    name: `RSA Academy (${email})`,
    issuer: "RSA Academy",
    length: 20,
  });
  return { base32: secret.base32, otpauthUrl: secret.otpauth_url! };
}

export async function generateQrDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}

/** window: 2 → tolerates up to ~1 minute of clock drift either side. */
export function verifyTotp(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 2,
  });
}

export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(4).toString("hex"),
  );
}

export async function hashBackupCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function verifyBackupCode(
  code: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(code, hash);
}
