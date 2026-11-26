"use client";

import { useEffect, useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import {
  ATTEMPT_TIMEOUT_MS,
  ROUTE_STORAGE_KEY,
  VERCEL_BUDGET_KEY,
  freshRoute,
  nextRoute,
  parseFileUrl,
  probePlan,
  routeUrl,
  runProbePlan,
  takeVercel,
  type Origins,
  type Route,
  type RouteChoice,
  type VercelBudget,
} from "@/lib/filesFailover";

const ELEMENT_SELECTOR = "img[src], video[src], audio[src], source[src], iframe[src]";
const ERROR_TARGETS = new Set(["IMG", "VIDEO", "AUDIO", "SOURCE"]);
/** Show "connecting…" only if the first attempt is still pending after this long (no flicker on fast networks). */
const SHOW_PENDING_AFTER_MS = 1500;

type Ui =
  | { kind: "connecting"; attempt: number; total: number }
  | { kind: "fallback" }
  | { kind: "limited" }
  | null;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function readJson<T>(key: string): T | null {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private mode: state just isn't remembered
  }
}

/** Any HTTP answer (even the Worker's 403 for an unsigned link) proves the origin is reachable. */
async function probeOrigin(origin: string): Promise<boolean> {
  try {
    await fetch(`${origin}/f/healthcheck`, {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Mounted once in the root layout. Keeps file links on the Cloudflare Worker
 * whenever it can be reached, and otherwise walks the ordered fallbacks in
 * lib/filesFailover.ts (retry → alt origin → Vercel proxy as the very last
 * resort, with a small budget). Shows a status line while it works.
 */
export function FilesFailover({
  workerOrigin,
  altOrigin,
}: {
  workerOrigin: string | null;
  altOrigin: string | null;
}) {
  const [ui, setUi] = useState<Ui>(null);

  useEffect(() => {
    if (!workerOrigin) return;
    const origins: Origins = { primary: workerOrigin, alt: altOrigin };
    const hasAlt = !!altOrigin;
    let mode: Route = "primary"; // where elements that still point at the primary origin get sent
    let cancelled = false;
    const history = new Map<string, Route[]>(); // routes already used per file id

    /** Vercel is gated: one attempt per file per session + a per-minute budget. */
    const vercelAllowed = (fileId: string): boolean => {
      const budget = readJson<VercelBudget>(VERCEL_BUDGET_KEY) ?? { files: [], stamps: [] };
      const decision = takeVercel(budget, fileId, Date.now());
      writeJson(VERCEL_BUDGET_KEY, decision.budget);
      if (!decision.allowed && decision.reason === "rate_limited") setUi({ kind: "limited" });
      return decision.allowed;
    };

    const send = (el: Element, attr: string, fileId: string, file: { id: string; search: string }, route: Route) => {
      const used = history.get(fileId) ?? [];
      const retry = route === "primary" ? used.filter((r) => r === "primary").length : 0;
      const url = routeUrl(route, file, origins, retry);
      if (!url) return;
      history.set(fileId, [...used, route]);
      el.setAttribute(attr, url);
      if (route === "vercel") setUi((cur) => (cur?.kind === "limited" ? cur : { kind: "fallback" }));
    };

    /** Eager rewrite for elements still on the primary origin (never for ones mid-retry). */
    const reroute = (el: Element) => {
      if (mode === "primary") return;
      const file = parseFileUrl(el.getAttribute("src"), origins);
      if (!file || file.origin !== "primary" || new URL(el.getAttribute("src")!, location.href).searchParams.has("r")) return;
      if (mode === "vercel" && !vercelAllowed(file.id)) return;
      send(el, "src", file.id, file, mode);
    };
    const rerouteAll = (root: ParentNode) => {
      if (root instanceof Element && root.matches(ELEMENT_SELECTOR)) reroute(root);
      root.querySelectorAll(ELEMENT_SELECTOR).forEach(reroute);
    };

    // One file failed to load (e.g. expired link, Drive hiccup): walk ITS chain.
    const onError = (event: Event) => {
      const el = event.target;
      if (!(el instanceof Element) || !ERROR_TARGETS.has(el.tagName)) return;
      const file = parseFileUrl(el.getAttribute("src"), origins);
      if (!file) return;
      const used = history.get(file.id) ?? [file.origin];
      history.set(file.id, used);
      const next = nextRoute(used, hasAlt);
      if (!next) return;
      if (next === "vercel" && !vercelAllowed(file.id)) return;
      send(el, "src", file.id, file, next);
    };
    document.addEventListener("error", onError, true);

    // Links are rewritten at click time (so merely viewing a page never spends Vercel budget).
    const onClick = (event: MouseEvent) => {
      if (mode === "primary" || !(event.target instanceof Element)) return;
      const a = event.target.closest("a[href]");
      const file = a && parseFileUrl(a.getAttribute("href"), origins);
      if (!a || !file || file.origin !== "primary") return;
      if (mode === "vercel" && !vercelAllowed(file.id)) {
        event.preventDefault();
        return;
      }
      const url = routeUrl(mode, file, origins);
      if (url) a.setAttribute("href", url);
    };
    document.addEventListener("click", onClick, true);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes") reroute(record.target as Element);
        record.addedNodes.forEach((node) => node instanceof Element && rerouteAll(node));
      }
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["src"],
    });

    const apply = (choice: RouteChoice) => {
      mode = choice === "alt" ? "alt" : choice === "none" ? "vercel" : "primary";
      if (mode !== "primary") rerouteAll(document);
      if (mode === "alt") setUi(null);
      if (mode === "vercel") setUi({ kind: "fallback" });
    };

    const cached = freshRoute(readJson(ROUTE_STORAGE_KEY), Date.now());
    if (cached) {
      apply(cached.route);
    } else {
      const plan = probePlan(hasAlt);
      let settled = false;
      const pendingTimer = setTimeout(() => {
        if (!settled) setUi({ kind: "connecting", attempt: 1, total: plan.length });
      }, SHOW_PENDING_AFTER_MS);
      runProbePlan(
        (route) => probeOrigin(route === "alt" ? altOrigin! : workerOrigin),
        plan,
        sleep,
        (attempt, total) => {
          if (attempt > 1 && !cancelled) setUi({ kind: "connecting", attempt, total });
        },
      ).then((winner) => {
        settled = true;
        clearTimeout(pendingTimer);
        if (cancelled) return;
        setUi(null);
        const choice: RouteChoice = winner ?? "none";
        writeJson(ROUTE_STORAGE_KEY, { route: choice, at: Date.now() });
        apply(choice);
      });
    }

    return () => {
      cancelled = true;
      document.removeEventListener("error", onError, true);
      document.removeEventListener("click", onClick, true);
      observer.disconnect();
    };
  }, [workerOrigin, altOrigin]);

  if (!ui) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-16 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm shadow-md md:bottom-4"
    >
      {ui.kind === "connecting" ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />
      ) : (
        <TriangleAlert className="size-4 shrink-0 text-warning" aria-hidden="true" />
      )}
      <span>
        {ui.kind === "connecting" && `جارٍ الاتصال بخادم الملفات… (محاولة ${ui.attempt} من ${ui.total})`}
        {ui.kind === "fallback" && "تعذّر الوصول إلى خادم الملفات الرئيسي — تُعرض الملفات بمسار بديل أبطأ."}
        {ui.kind === "limited" && "الملفات غير متاحة مؤقتًا على هذه الشبكة — حاول مرة أخرى بعد دقيقة."}
      </span>
    </div>
  );
}
