/**
 * Run: npx tsx scripts/test-files-worker-health.ts
 * checkFilesWorker() maps every Worker state to the right admin warning.
 */
import assert from "node:assert/strict";
import { checkFilesWorker } from "../lib/filesWorkerHealth";

const respond = (status: number) => (async () => new Response(null, { status })) as unknown as typeof fetch;

async function main() {
  delete process.env.FILES_WORKER_URL;
  let h = await checkFilesWorker();
  assert.match(h.issue!, /غير مضبوط/);
  assert.equal(h.probeUrl, null);

  process.env.FILES_WORKER_URL = "https://w.example.workers.dev/";
  process.env.FILES_SIGNING_SECRET = "s";

  let seen = "";
  globalThis.fetch = (async (url: string) => {
    seen = url;
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
  h = await checkFilesWorker();
  assert.equal(h.issue, null, "404 for the fake file = healthy");
  assert.match(seen, /^https:\/\/w\.example\.workers\.dev\/f\/rsa-healthcheck\?e=\d+&s=/);
  assert.equal(h.probeUrl, seen);

  globalThis.fetch = respond(403);
  assert.match((await checkFilesWorker()).issue!, /FILES_SIGNING_SECRET/);
  globalThis.fetch = respond(502);
  assert.match((await checkFilesWorker()).issue!, /Google Drive/);
  globalThis.fetch = (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
  assert.match((await checkFilesWorker()).issue!, /لا يستجيب/);

  console.log("files-worker-health: all checks passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
