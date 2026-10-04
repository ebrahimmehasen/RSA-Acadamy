import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FileKind } from "./fileKinds";

/**
 * Proof that a file of a given kind was fully uploaded to Drive (and
 * confirmed by Drive itself) by a given uploader. The browser hands it to
 * the feature's server action instead of the file bytes.
 */
interface TicketPayload {
  /** Drive file id */
  f: string;
  k: FileKind;
  /** uploader profile id (0 = signed-out signup) */
  u: number;
  n: string;
  m: string;
  t: number;
  /** expiry (ms epoch) */
  e: number;
}

export interface RedeemedFile {
  driveFileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

function sign(body: string): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("server secret is not configured");
  // own domain prefix: an upload-session token can never pass as a ticket
  return createHmac("sha256", key).update(`file-ticket.${body}`).digest("base64url");
}

export function signFileTicket(p: Omit<TicketPayload, "e">): string {
  const body = Buffer.from(
    JSON.stringify({ ...p, e: Date.now() + 24 * 60 * 60 * 1000 }),
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

function verify(ticket: string): TicketPayload | null {
  const [body, sig] = ticket.split(".");
  if (!body || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as TicketPayload;
    return typeof p.e === "number" && p.e >= Date.now() ? p : null;
  } catch {
    return null;
  }
}

/**
 * Validates a ticket for `kind` uploaded by `uploaderId` and links the file
 * to its owning entity in file_storage. Throws a user-facing error when the
 * ticket is forged, expired, for another kind or another user.
 * `claimFor` re-attributes a signup upload (uploader 0) to the new profile.
 */
export async function redeemFileTicket(
  ticket: string,
  opts: { kind: FileKind; uploaderId: number; entityId: string | number; claimFor?: number },
): Promise<RedeemedFile> {
  const p = verify(ticket);
  if (!p || p.k !== opts.kind || p.u !== opts.uploaderId) {
    throw new Error("الملف المرفوع غير صالح أو انتهت صلاحيته — ارفعه مرة أخرى");
  }
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("file_storage")
    .update({
      entity_id: String(opts.entityId),
      ...(opts.claimFor ? { uploaded_by: opts.claimFor } : {}),
    })
    .eq("drive_file_id", p.f);
  if (error) throw new Error(error.message);
  return { driveFileId: p.f, fileName: p.n, mimeType: p.m, sizeBytes: p.t };
}

/** Reads the optional ticket field of a form (empty → null). */
export function ticketField(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" && value.length > 0 ? value : null;
}
