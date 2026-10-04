/**
 * Run: npx tsx scripts/test-direct-upload.ts
 * Exercises the browser uploader's direct-to-Drive path, its 308/Range
 * handling, the relay fallback and the allow-list — with a fake fetch.
 */
import assert from "node:assert/strict";
import { uploadSessionVideo, uploadSubmissionFile } from "../lib/submissionUploader";
import { directUploadOrigin } from "../lib/directUpload";

const MB = 1024 * 1024;
const DRIVE = "https://www.googleapis.com/upload/drive/v3/files?upload_id=abc";
const file = new File([new Uint8Array(20 * MB)], "answer.pdf", { type: "application/pdf" });
const finished = { id: "drive1", name: "answer.pdf", mimeType: "application/pdf", sizeBytes: file.size };
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

function fakeServer(opts: { direct: boolean; driveFails?: boolean }) {
  const calls: { url: string; method: string }[] = [];
  let driveHas = 0;
  const impl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ url, method });
    if (url === DRIVE) {
      if (opts.driveFails) throw new TypeError("Failed to fetch");
      const m = /bytes (\d+)-(\d+)\/(\d+)/.exec(new Headers(init?.headers).get("content-range")!)!;
      assert.equal(Number(m[1]), driveHas, "chunks must be contiguous");
      assert.equal(Number(m[1]) % (256 * 1024), 0, "offset must be 256KiB aligned");
      driveHas = Number(m[2]) + 1;
      return Number(m[3]) === driveHas
        ? json({ id: "drive1" })
        : new Response(null, { status: 308, headers: { Range: `bytes=0-${driveHas - 1}` } });
    }
    if (url === "/api/uploads/submission" && method === "POST") {
      return json({
        token: "t",
        chunkBytes: 4 * MB,
        ...(opts.direct ? { direct: { url: DRIVE, chunkBytes: 8 * MB } } : {}),
      });
    }
    if (url.startsWith("/api/uploads/submission?token=t")) {
      if (method === "PUT") {
        const off = Number(new URL(url, "http://x").searchParams.get("offset"));
        const len = (init!.body as Blob).size;
        driveHas = off + len;
        return driveHas >= file.size ? json({ done: true, file: finished }) : json({ done: false, nextOffset: driveHas });
      }
      // status / finalize
      return driveHas >= file.size ? json({ done: true, file: finished }) : json({ done: false, nextOffset: driveHas });
    }
    throw new Error(`unexpected ${method} ${url}`);
  };
  return { impl: impl as typeof fetch, calls };
}

async function main() {
  // 1. direct: 20MB = 8+8+4 → 3 PUTs to Drive, ZERO bytes through our relay, one finalize GET
  {
    const s = fakeServer({ direct: true });
    const out = await uploadSubmissionFile(file, 1, () => {}, { fetchImpl: s.impl });
    assert.deepEqual(out, finished);
    assert.equal(s.calls.filter((c) => c.url === DRIVE).length, 3);
    assert.equal(s.calls.filter((c) => c.method === "PUT" && c.url.startsWith("/api/")).length, 0);
    assert.equal(s.calls.filter((c) => c.method === "GET").length, 1);
  }
  // 2. server withholds `direct` → pure relay, nothing to Drive
  {
    const s = fakeServer({ direct: false });
    const out = await uploadSubmissionFile(file, 1, () => {}, { fetchImpl: s.impl });
    assert.deepEqual(out, finished);
    assert.equal(s.calls.filter((c) => c.url === DRIVE).length, 0);
    assert.equal(s.calls.filter((c) => c.method === "PUT").length, 5);
  }
  // 3. browser can't reach Drive (CORS/blocked) → falls back to relay and still finishes
  {
    const s = fakeServer({ direct: true, driveFails: true });
    const out = await uploadSubmissionFile(file, 1, () => {}, { fetchImpl: s.impl, retryDelayMs: 1 });
    assert.deepEqual(out, finished);
    assert.ok(s.calls.filter((c) => c.method === "PUT" && c.url.startsWith("/api/")).length >= 5);
  }

  // recorded-session video: init carries the session details, bytes go to Drive directly
  {
    let initBody: Record<string, unknown> | null = null;
    const sent: string[] = [];
    let has = 0;
    const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      sent.push(`${init?.method ?? "GET"} ${url.split("?")[0]}`);
      if (url === "/api/uploads/session" && init?.method === "POST") {
        initBody = JSON.parse(String(init.body));
        return json({ token: "t", chunkBytes: 4 * MB, direct: { url: DRIVE, chunkBytes: 8 * MB } });
      }
      if (url === DRIVE) {
        const m = /bytes (\d+)-(\d+)\/(\d+)/.exec(new Headers(init?.headers).get("content-range")!)!;
        has = Number(m[2]) + 1;
        return Number(m[3]) === has
          ? json({ id: "vid" })
          : new Response(null, { status: 308, headers: { Range: `bytes=0-${has - 1}` } });
      }
      if (url.startsWith("/api/uploads/session?token=t")) {
        return json({ done: true, file: { ...finished, id: "vid" } });
      }
      throw new Error(`unexpected ${url}`);
    }) as typeof fetch;
    const video = new File([new Uint8Array(10 * MB)], "lesson.mp4", { type: "video/mp4" });
    const out = await uploadSessionVideo(
      video,
      { classId: 3, subjectId: "MATH", title: "Algebra", description: "", isPublic: false, accessibleStudents: [7, 9] },
      () => {},
      { fetchImpl: impl },
    );
    assert.equal(out.id, "vid");
    assert.deepEqual(
      { c: initBody!.classId, s: initBody!.subjectId, p: initBody!.isPublic, st: initBody!.accessibleStudents, size: initBody!.size },
      { c: 3, s: "MATH", p: false, st: [7, 9], size: 10 * MB },
    );
    assert.equal(sent.filter((x) => x.startsWith("PUT /api/")).length, 0);
  }

  // allow-list
  const req = (origin: string | null) => new Request("https://x/api", { headers: origin ? { origin } : {} });
  process.env.NEXT_PUBLIC_APP_URL = "https://rsa-academy.online";
  process.env.UPLOAD_ALLOWED_ORIGINS = "https://rsa-academy-preview.vercel.app, not a url";
  delete process.env.UPLOAD_DIRECT;
  assert.equal(directUploadOrigin(req("https://rsa-academy.online")), "https://rsa-academy.online");
  assert.equal(directUploadOrigin(req("https://rsa-academy-preview.vercel.app")), "https://rsa-academy-preview.vercel.app");
  assert.equal(directUploadOrigin(req("https://evil.example")), null);
  assert.equal(directUploadOrigin(req(null)), null);
  process.env.UPLOAD_DIRECT = "off";
  assert.equal(directUploadOrigin(req("https://rsa-academy.online")), null);

  console.log("direct-upload: all checks passed");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
