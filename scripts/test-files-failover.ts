/**
 * Run: npx tsx scripts/test-files-failover.ts
 * Pure logic behind components/shared/FilesFailover.tsx — the ordered
 * fallbacks (Cloudflare → alt → Cloudflare → Vercel last), the 5s/17s
 * timings and the Vercel budget.
 */
import assert from "node:assert/strict";
import {
  ATTEMPT_GAP_MS,
  ATTEMPT_TIMEOUT_MS,
  VERCEL_PER_MINUTE,
  freshRoute,
  nextRoute,
  parseFileUrl,
  planDurationMs,
  probePlan,
  routeUrl,
  runProbePlan,
  takeVercel,
  type Origins,
  type Route,
  type VercelBudget,
} from "../lib/filesFailover";

const P = "https://rsa-files.example.workers.dev";
const A = "https://rsa-alt.example.workers.dev";
const origins: Origins = { primary: P, alt: A };
const noAlt: Origins = { primary: P, alt: null };

async function main() {
  // ---- timings: 5s per attempt, 17s worst case ------------------------------
  assert.equal(ATTEMPT_TIMEOUT_MS, 5000);
  assert.equal(ATTEMPT_GAP_MS, 1000);
  assert.deepEqual(probePlan(true), ["primary", "alt", "primary"]);
  assert.deepEqual(probePlan(false), ["primary", "primary", "primary"]);
  assert.equal(planDurationMs(probePlan(true)), 17_000);
  assert.equal(planDurationMs(probePlan(false)), 17_000);

  // virtual clock: every probe burns its full 5s timeout, sleeps are the 1s gaps
  const run = async (plan: ("primary" | "alt")[], answers: Record<number, boolean>) => {
    let clock = 0;
    const tried: string[] = [];
    const seen: string[] = [];
    let n = 0;
    const winner = await runProbePlan(
      async (route) => {
        tried.push(route);
        const ok = answers[n++] ?? false;
        clock += ok ? 300 : ATTEMPT_TIMEOUT_MS;
        return ok;
      },
      plan,
      async (ms) => void (clock += ms),
      (attempt, total) => seen.push(`${attempt}/${total}`),
    );
    return { winner, tried, clock, seen };
  };

  let r = await run(probePlan(true), {});
  assert.equal(r.winner, null);
  assert.deepEqual(r.tried, ["primary", "alt", "primary"]); // alt in the middle, then Cloudflare again
  assert.equal(r.clock, 17_000);
  assert.deepEqual(r.seen, ["1/3", "2/3", "3/3"]); // what the loading line shows

  r = await run(probePlan(false), {});
  assert.deepEqual(r.tried, ["primary", "primary", "primary"]); // no alt configured -> skipped
  assert.equal(r.clock, 17_000);

  r = await run(probePlan(true), { 0: true });
  assert.equal(r.winner, "primary");
  assert.deepEqual(r.tried, ["primary"]); // success stops immediately
  r = await run(probePlan(true), { 1: true });
  assert.equal(r.winner, "alt");
  assert.equal(r.clock, 5000 + 1000 + 300);
  r = await run(probePlan(true), { 2: true });
  assert.equal(r.winner, "primary"); // the retry of Cloudflare can win

  // ---- per-file chain: Vercel is always last -------------------------------
  const chain = (hasAlt: boolean) => {
    const history: Route[] = ["primary"];
    for (let next = nextRoute(history, hasAlt); next; next = nextRoute(history, hasAlt)) history.push(next);
    return history;
  };
  assert.deepEqual(chain(true), ["primary", "alt", "primary", "vercel"]);
  assert.deepEqual(chain(false), ["primary", "primary", "vercel"]);
  assert.equal(nextRoute(["primary", "alt", "primary", "vercel"], true), null); // never loops back
  assert.equal(nextRoute(["alt"], true), "primary"); // started on alt (page-level failover) -> retry Cloudflare next
  assert.equal(nextRoute(["alt", "primary", "primary"], true), "vercel");
  for (const hasAlt of [true, false]) {
    assert.notEqual(nextRoute([], hasAlt), "vercel", "vercel is never the first choice");
  }

  // ---- URLs ----------------------------------------------------------------
  const link = `${P}/f/1AbC_d-9?e=1&s=sig&dl=1`;
  const file = parseFileUrl(link, origins)!;
  assert.deepEqual({ id: file.id, origin: file.origin }, { id: "1AbC_d-9", origin: "primary" });
  assert.equal(routeUrl("primary", file, origins), link.replace("&dl=1", "") + "&dl=1");
  assert.equal(routeUrl("alt", file, origins), `${A}/f/1AbC_d-9?e=1&s=sig&dl=1`); // same signed query, other host
  assert.equal(routeUrl("alt", file, noAlt), null); // no alt configured
  assert.equal(routeUrl("primary", file, origins, 2), `${P}/f/1AbC_d-9?e=1&s=sig&dl=1&r=2`); // retry is a fresh request
  assert.equal(routeUrl("primary", { ...file, search: file.search + "&r=1" }, origins, 2)!.match(/r=/g)?.length, 1);
  assert.equal(routeUrl("vercel", file, origins), "/api/files/1AbC_d-9?dl=1");
  assert.equal(routeUrl("vercel", { id: "x", search: "?e=1&s=2" }, origins), "/api/files/x");
  assert.equal(parseFileUrl(`${A}/f/zzz?e=1`, origins)?.origin, "alt");
  assert.equal(parseFileUrl(`${A}/f/zzz?e=1`, noAlt), null);
  for (const bad of ["/api/files/abc", "https://evil.example/f/abc", `${P}/other/abc`, `${P}/f/a/b`, `${P}/f/`, `${P}.evil.example/f/abc`, "javascript:alert(1)", "nope", "", null, undefined]) {
    assert.equal(parseFileUrl(bad as string, origins), null, String(bad));
  }

  // ---- remembered result: 'none' expires fastest so Cloudflare is retried soon ----
  const now = 1_000_000_000;
  assert.equal(freshRoute(null, now), null);
  assert.equal(freshRoute({ route: "primary", at: now - 59 * 60_000 }, now)?.route, "primary");
  assert.equal(freshRoute({ route: "primary", at: now - 61 * 60_000 }, now), null);
  assert.equal(freshRoute({ route: "alt", at: now - 9 * 60_000 }, now)?.route, "alt");
  assert.equal(freshRoute({ route: "alt", at: now - 11 * 60_000 }, now), null);
  assert.equal(freshRoute({ route: "none", at: now - 119_000 }, now)?.route, "none");
  assert.equal(freshRoute({ route: "none", at: now - 121_000 }, now), null);
  assert.equal(freshRoute({ route: "bogus", at: now } as never, now), null);
  assert.equal(freshRoute({ route: "primary", at: "now" } as never, now), null);

  // ---- Vercel budget: one attempt per file per session + small per-minute cap ----
  assert.equal(VERCEL_PER_MINUTE, 6);
  let budget: VercelBudget = { files: [], stamps: [] };
  const t = 5_000_000;
  for (let i = 0; i < VERCEL_PER_MINUTE; i++) {
    const d = takeVercel(budget, `file${i}`, t + i * 1000);
    assert.equal(d.allowed, true, `file${i} within budget`);
    budget = d.budget;
  }
  let d = takeVercel(budget, "file-extra", t + 10_000);
  assert.deepEqual([d.allowed, !d.allowed && d.reason], [false, "rate_limited"]); // 7th file in a minute: refused
  d = takeVercel(budget, "file0", t + 10_000);
  assert.deepEqual([d.allowed, !d.allowed && d.reason], [false, "already_tried"]); // same file twice: refused
  d = takeVercel(budget, "file-extra", t + 61_000); // a minute later the budget frees up
  assert.equal(d.allowed, true);
  d = takeVercel(d.budget, "file-extra", t + 62_000);
  assert.deepEqual([d.allowed, !d.allowed && d.reason], [false, "already_tried"]); // ...but never the same file again this session

  console.log("files-failover: all checks passed");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
