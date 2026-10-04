/**
 * Run: npx tsx scripts/test-file-tickets.ts
 * Generic uploads (lib/uploads): the form helper swaps files for tickets
 * (no bytes reach the server action), and tickets can't be forged or
 * reused across kinds / users.
 */
import assert from "node:assert/strict";
import { replaceFilesWithTickets } from "../lib/uploads/client";
import { redeemFileTicket, signFileTicket } from "../lib/uploads/ticket";
import { isFileKind } from "../lib/uploads/fileKinds";

process.env.SUPABASE_SERVICE_ROLE_KEY = "test-secret";
const DRIVE = "https://www.googleapis.com/upload/drive/v3/files?upload_id=xyz";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

async function main() {
  // 1. form helper: every file goes to Drive, the action only gets tickets
  const initKinds: string[] = [];
  let driveBytes = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/uploads/file" && init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      initKinds.push(body.kind);
      return json({ token: `tok-${body.fileName}`, chunkBytes: 4 << 20, direct: { url: DRIVE, chunkBytes: 8 << 20 } });
    }
    if (url === DRIVE) {
      driveBytes += (init!.body as Blob).size;
      return json({ id: "d" });
    }
    if (url.startsWith("/api/uploads/file?token=")) {
      const name = decodeURIComponent(url.split("tok-")[1]);
      return json({ done: true, file: { id: `id-${name}`, name, mimeType: "x", sizeBytes: 1, ticket: `ticket-${name}` } });
    }
    throw new Error(`unexpected ${init?.method} ${url}`);
  }) as typeof fetch;

  const fd = new FormData();
  fd.append("full_name", "Mona");
  fd.append("profile_picture", new File([new Uint8Array(1000)], "me.png", { type: "image/png" }));
  fd.append("attachments", new File([new Uint8Array(2000)], "a.pdf", { type: "application/pdf" }));
  fd.append("attachments", new File([new Uint8Array(3000)], "b.pdf", { type: "application/pdf" }));
  fd.append("cv", new File([], "", { type: "application/octet-stream" })); // empty input → skipped
  await replaceFilesWithTickets(fd, [
    { name: "profile_picture", kind: "profile_picture", ticketName: "profile_picture_ticket" },
    { name: "attachments", kind: "announcement_attachment", ticketName: "attachment_tickets" },
    { name: "cv", kind: "teacher_cv", ticketName: "cv_ticket" },
  ]);
  assert.deepEqual(initKinds, ["profile_picture", "announcement_attachment", "announcement_attachment"]);
  assert.equal(driveBytes, 6000);
  assert.equal(fd.get("profile_picture_ticket"), "ticket-me.png");
  assert.deepEqual(fd.getAll("attachment_tickets"), ["ticket-a.pdf", "ticket-b.pdf"]);
  assert.equal(fd.get("cv_ticket"), null);
  for (const [, value] of fd) assert.equal(typeof value, "string", "no File may reach the action");
  assert.equal(fd.get("full_name"), "Mona");

  // 2. tickets: wrong kind / wrong user / forged / tampered are rejected (before any DB call)
  const ticket = signFileTicket({ f: "drive1", k: "teacher_cv", u: 7, n: "cv.pdf", m: "application/pdf", t: 10 });
  const rejects = (t: string, kind: "teacher_cv" | "profile_picture", uploaderId: number) =>
    assert.rejects(redeemFileTicket(t, { kind, uploaderId, entityId: 1 }), /غير صالح/);
  await rejects(ticket, "profile_picture", 7);
  await rejects(ticket, "teacher_cv", 8);
  await rejects("garbage", "teacher_cv", 7);
  const [body, sig] = ticket.split(".");
  const tampered = Buffer.from(
    JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), u: 8 }),
  ).toString("base64url");
  await rejects(`${tampered}.${sig}`, "teacher_cv", 8);

  assert.equal(isFileKind("teacher_cv"), true);
  assert.equal(isFileKind("toString"), false);
  assert.equal(isFileKind("../etc"), false);

  console.log("file-tickets: all checks passed");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
