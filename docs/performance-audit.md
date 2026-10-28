# Performance audit — Fluid Active CPU (Oct 2026)

Trigger: the Vercel Hobby project was paused on 2026-10-28. Fluid Active CPU
hit 4h 12m of 4h, while function invocations were only 402K of 1M (CDN
requests: 240K). So the problem is CPU spent per invocation plus extra
invocations, not raw traffic.

## Architecture (verified)

- Next.js 16.2.12 (App Router, Turbopack), React 19.2.4, npm. Node runtime.
  Deployed with the Vercel CLI from GitHub Actions
  (`.github/workflows/vercel-deploy.yml`).
- Supabase (auth + Postgres + realtime). Files are on Google Drive: uploads
  go browser → Drive, downloads go through a Cloudflare Worker (CLAUDE.md).
- `proxy.ts` (middleware) runs on every non-asset request. It calls
  `supabase.auth.getUser()`. On role paths it also queries `profiles` and,
  unless the MFA cookie is valid, `user_2fa`.
- Role layouts (`app/(admin|teacher|student|parent)/**/layout.tsx`) and
  `app/settings/layout.tsx` are `force-dynamic` and call `getSession()`.
  31 pages call `getSession` / `requireAuth` / `requireRole` again.
- Crons: 2 daily jobs (`vercel.json`), negligible.
- Client: `RealtimeRefresh` (router.refresh on filtered postgres_changes),
  `useNotifications` (one query + a realtime channel), no polling of the
  server.

## Findings (ranked)

| # | Where | Evidence | Status |
|---|---|---|---|
| 1 | `app/page.tsx` (landing) | Fully SSR'd on every visit, including bots, because it read cookies via `getSession()`. Measured at **53 ms CPU per request**. | Confirmed, fixed |
| 2 | `next/link` viewport prefetch | One landing-page view fired **8 RSC prefetch requests** (DevTools network). `RoleShell` renders 10–20 nav links on every authenticated page, and each prefetch is a separate function invocation that also runs `proxy.ts`. Fits invocations (402K) exceeding CDN requests (240K). | Confirmed mechanism, fixed in the shell. Per-route share unmeasured. |
| 3 | `app/(auth)/signup/page.tsx` | `force-dynamic`, but it only loads public catalog data. Measured at **66 ms CPU per request**. It is also prefetched from the landing page (2 of the 8 requests above). | Confirmed, fixed |
| 4 | `lib/auth/session.ts` `getSession` | Not memoized. Layout, page and each `requireAuth`/`requireRole` in the same render each repeated `getUser` plus 2 queries (JSON parsing and client setup each time). | Confirmed by code; can't benchmark without a login |
| 5 | `proxy.ts` matcher covered `/api/*` | Every `/api/files` and upload-chunk request ran middleware `getUser` before the handler re-authenticated. **12.2 → 7.6 ms** on `/api/files` (401 path). | Confirmed, fixed |
| 6 | `proxy.ts` role paths | `profiles` query (also done by the layout) and a `user_2fa` query on every request for users without a valid MFA cookie. | Hypothesis: likely significant, not changed (security gate) |
| 7 | Lists of `<Link>` in pages (e.g. admin tables) | Same prefetch mechanism as #2, on detail links. | Hypothesis, not changed |

Not CPU problems: crons (daily), `ScheduleSpotlight` interval (client only),
`RealtimeRefresh` watches (all filtered by id, and RLS-scoped).

## Changes

1. **`app/page.tsx`**: static + ISR (`revalidate = 3600`). The existing
   `revalidatePath("/")` in the platform settings action keeps it fresh.
   Signed-in visitors are redirected by `proxy.ts`, which already had the
   user. A guard avoids a redirect loop when a profile row is missing.
2. **`app/(auth)/signup/page.tsx`**: ISR (`revalidate = 300`).
   `revalidatePath("/signup")` is added to every admin subject action, so
   catalog edits show immediately.
3. **`lib/auth/session.ts`**: `getSession` is wrapped in React `cache()`,
   so there is one lookup per request render. Auth semantics are unchanged.
   It's still per request and never shared across users.
4. **`proxy.ts`**: the matcher now skips `api/`. Every route handler
   authenticates itself (verified: `requireAuth`/`requireRole`, signed
   upload tokens, cron secret). The proxy never enforced roles or 2FA on
   `/api`.
5. **`components/shared/RoleShell.tsx`**: nav links use `prefetch={false}`
   plus `router.prefetch` on hover / touchstart / focus. Clicks stay fast,
   with no prefetch storm per page view.

## Before / after (local `next start`, server-process CPU, 150 requests each)

| Path | Before | After |
|---|---|---|
| `/` | 53.13 ms | 12.71 ms |
| `/signup` | 65.83 ms | 11.04 ms |
| `/login` (static, control) | 10.21 ms | 10.52 ms |
| `/student/dashboard` (no session → 307) | 5.94 ms | 4.48 ms |
| `/api/files/abc` (401) | 12.19 ms | 7.60 ms |

These are local numbers (Windows laptop, includes Node HTTP overhead). On
Vercel, the static `/` and `/signup` are served from the CDN, so they cost
no function CPU at all apart from the middleware. Production impact must be
confirmed with Vercel data, not with these numbers.

## Expected impact (unverified in production)

- Landing and signup traffic: around −75–100% of their function CPU (high
  confidence).
- Authenticated navigation: fewer invocations per page view, because the
  shell's links no longer prefetch on viewport. Expected large, but the size
  depends on the share of prefetches in the 402K. That share is unknown.
- Each authenticated render: the repeated `getSession` work is gone (medium
  confidence on size).

## Telemetry needed to confirm

From the Vercel dashboard (Observability → Functions / Middleware), for the
last 30 days:
1. Active CPU and invocations **by route**, plus middleware invocations.
2. Share of requests with `Next-Router-Prefetch` / `_rsc` (prefetch).
3. Top user agents on `/` (bots).
4. After deploy: the same views for 3–7 days, then compare CPU per day.

## Remaining risks and next candidates

- Finding #6: deduplicate the proxy's `profiles` / `user_2fa` queries with the
  layout. This needs a careful security review of the 2FA gate, so it's not
  done blind. Also note `/settings/*` is not behind the proxy's 2FA gate
  today. That was true before this change too.
- Finding #7: apply intent prefetch to large link lists if telemetry shows
  prefetch dominates.
- The landing page shows `authEnabled` as of the last revalidation (at most
  1h, or instantly through the admin toggle).

## Verification commands

    npx tsc --noEmit
    npm run lint
    npm run build      # "/" and "/signup" now ○ (static, ISR 1h / 5m)
    npx next start -p 3100
    # bench: scratchpad bench.ps1 — server CPU delta / N requests per path
