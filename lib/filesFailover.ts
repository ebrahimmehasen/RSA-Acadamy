/**
 * Client-side routing for file links when the Cloudflare Worker is hard to reach.
 *
 * Why: *.workers.dev resolves to a few Cloudflare IPs; on some Egyptian
 * connections two of them (188.114.96.6 / 188.114.97.6) drop every packet.
 *
 * Order of preference, always:
 *   1. the Cloudflare Worker (primary origin)
 *   2. an optional second Worker origin (FILES_WORKER_URL_ALT, same code and
 *      signing secret, so the same signed query string is valid there)
 *   3. the Cloudflare Worker again (a retry)
 *   4. the Vercel /api/files proxy — LAST resort only: one attempt per file
 *      per session and a small per-minute budget, because every byte it
 *      serves counts against the Vercel plan.
 * Client-safe: no server imports.
 */

export type Route = "primary" | "alt" | "vercel";

/** How long one Cloudflare attempt may take, and the pause between attempts. */
export const ATTEMPT_TIMEOUT_MS = 5000;
export const ATTEMPT_GAP_MS = 1000;
/** Vercel proxy budget (per tab session). */
export const VERCEL_PER_MINUTE = 6;
const VERCEL_FILES_KEPT = 300;

export const ROUTE_STORAGE_KEY = "rsa_files_route";
export const VERCEL_BUDGET_KEY = "rsa_files_vercel_budget";

/** Cloudflare-only attempts for the page-level probe: [primary, alt?, primary]. */
export function probePlan(hasAlt: boolean): ("primary" | "alt")[] {
  return hasAlt ? ["primary", "alt", "primary"] : ["primary", "primary", "primary"];
}

/** Worst case wall time of a plan: every attempt times out. (3 × 5s + 2 × 1s = 17s) */
export function planDurationMs(plan: readonly unknown[]): number {
  return plan.length * ATTEMPT_TIMEOUT_MS + Math.max(0, plan.length - 1) * ATTEMPT_GAP_MS;
}

/**
 * Tries each origin of the plan in order; the first one that answers wins.
 * `probe` must itself give up after ATTEMPT_TIMEOUT_MS. Returns null when
 * every Cloudflare attempt failed.
 */
export async function runProbePlan(
  probe: (route: "primary" | "alt") => Promise<boolean>,
  plan: readonly ("primary" | "alt")[],
  sleep: (ms: number) => Promise<void>,
  onAttempt?: (attempt: number, total: number) => void,
): Promise<"primary" | "alt" | null> {
  for (let i = 0; i < plan.length; i++) {
    onAttempt?.(i + 1, plan.length);
    if (await probe(plan[i])) return plan[i];
    if (i < plan.length - 1) await sleep(ATTEMPT_GAP_MS);
  }
  return null;
}

// ---- remembered result (per tab session) ---------------------------------

export type RouteChoice = "primary" | "alt" | "none";
export interface CachedRoute {
  route: RouteChoice;
  at: number;
}
/** "none" (everything failed) expires fastest so Cloudflare gets tried again soon. */
const TTL_MS: Record<RouteChoice, number> = {
  primary: 60 * 60 * 1000,
  alt: 10 * 60 * 1000,
  none: 2 * 60 * 1000,
};

export function freshRoute(cached: CachedRoute | null, now: number): CachedRoute | null {
  if (!cached || typeof cached.at !== "number" || !(cached.route in TTL_MS)) return null;
  return now - cached.at < TTL_MS[cached.route] ? cached : null;
}

// ---- URL handling ----------------------------------------------------------

export interface Origins {
  primary: string;
  alt: string | null;
}

/** `{ id, search }` of a Worker file link on either origin (`<origin>/f/<id>?e=..&s=..`), else null. */
export function parseFileUrl(
  url: string | null | undefined,
  origins: Origins,
): { id: string; search: string; origin: "primary" | "alt" } | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const origin =
    parsed.origin === origins.primary ? "primary" : origins.alt && parsed.origin === origins.alt ? "alt" : null;
  if (!origin) return null;
  const match = parsed.pathname.match(/^\/f\/([\w-]+)$/);
  return match ? { id: match[1], search: parsed.search, origin } : null;
}

/** Concrete URL for a route. `retry` > 0 adds a cache-busting `r` so a retry is a fresh request. */
export function routeUrl(
  route: Route,
  file: { id: string; search: string },
  origins: Origins,
  retry = 0,
): string | null {
  if (route === "vercel") {
    const dl = new URLSearchParams(file.search).get("dl") === "1";
    // eslint-disable-next-line no-restricted-syntax -- the one sanctioned use of the proxy: last-resort failover
    return `/api/files/${file.id}${dl ? "?dl=1" : ""}`;
  }
  const base = route === "alt" ? origins.alt : origins.primary;
  if (!base) return null;
  const params = new URLSearchParams(file.search);
  params.delete("r");
  if (retry > 0) params.set("r", String(retry));
  const query = params.toString();
  return `${base}/f/${file.id}${query ? `?${query}` : ""}`;
}

/**
 * Next route to try for ONE file that just failed, given the routes already
 * used for it: primary → alt (if configured) → primary again → vercel → stop.
 */
export function nextRoute(history: readonly Route[], hasAlt: boolean): Route | null {
  const sequence: Route[] = hasAlt ? ["primary", "alt", "primary", "vercel"] : ["primary", "primary", "vercel"];
  const used: Record<Route, number> = { primary: 0, alt: 0, vercel: 0 };
  for (const route of history) used[route]++;
  for (const route of sequence) {
    if (used[route] > 0) used[route]--;
    else return route;
  }
  return null;
}

// ---- Vercel proxy budget -----------------------------------------------------

export interface VercelBudget {
  files: string[];
  stamps: number[];
}

export type VercelDecision =
  | { allowed: true; budget: VercelBudget }
  | { allowed: false; reason: "already_tried" | "rate_limited"; budget: VercelBudget };

/** One proxy attempt per file per session, and at most VERCEL_PER_MINUTE files per minute. */
export function takeVercel(budget: VercelBudget, fileId: string, now: number): VercelDecision {
  const stamps = budget.stamps.filter((t) => now - t < 60_000);
  if (budget.files.includes(fileId)) return { allowed: false, reason: "already_tried", budget: { ...budget, stamps } };
  if (stamps.length >= VERCEL_PER_MINUTE) return { allowed: false, reason: "rate_limited", budget: { ...budget, stamps } };
  return {
    allowed: true,
    budget: { files: [...budget.files, fileId].slice(-VERCEL_FILES_KEPT), stamps: [...stamps, now] },
  };
}
