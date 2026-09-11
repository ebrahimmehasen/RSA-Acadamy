"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SCHOOL_TIMEZONE, localHourMinute } from "@/lib/timezone";
import { formatHourMinute, type DayOfWeek } from "@/lib/schedule";
import { cn } from "@/lib/utils";

export interface ScheduleSpotlightEntry {
  id: string | number;
  day: DayOfWeek;
  /** "HH:MM" or "HH:MM:SS" — wall-clock time in the school timezone */
  start: string;
  end: string;
  subject: string;
  zoomLink?: string | null;
  zoomPasscode?: string | null;
}

const hhmm = (t: string) => t.slice(0, 5);
const toMin = (t: string) => {
  const [h, m] = hhmm(t).split(":").map(Number);
  return h * 60 + m;
};

/**
 * Where the viewer's browser is — the school clock (for "now") and the
 * viewer's own timezone (for displaying times). Refreshed every minute.
 * Shared by ScheduleGrid and ScheduleSpotlight so both agree on "now".
 */
export function useViewerClock() {
  const [clock, setClock] = useState<{
    ready: boolean;
    day: DayOfWeek | null;
    minutes: number;
    tz: string;
  }>({ ready: false, day: null, minutes: 0, tz: SCHOOL_TIMEZONE });

  useEffect(() => {
    function compute() {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: SCHOOL_TIMEZONE,
          weekday: "long",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).formatToParts(new Date());
        const wd = parts
          .find((p) => p.type === "weekday")
          ?.value.toLowerCase() as DayOfWeek | undefined;
        const hh = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
        const mm = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
        setClock({
          ready: true,
          day: wd ?? null,
          minutes: hh * 60 + mm,
          tz: tz || SCHOOL_TIMEZONE,
        });
      } catch {
        setClock((c) => ({ ...c, ready: false }));
      }
    }
    compute();
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, []);

  return clock;
}

/**
 * The compact "what's happening now" box — the class running now, or
 * the next one today, with its join link (only within 15 minutes of
 * start). Used standalone on dashboards, and embedded above the full
 * matrix in <ScheduleGrid>.
 */
export function ScheduleSpotlight({
  entries,
  zoomLabel,
  emptyLabel = "لا توجد حصص أخرى اليوم",
  loadingLabel,
  prefix,
}: {
  entries: ScheduleSpotlightEntry[];
  /** when set, shows a join link with this label */
  zoomLabel?: string;
  emptyLabel?: string;
  /** extra node shown while the viewer's clock isn't ready yet */
  loadingLabel?: ReactNode;
  /** extra node shown before the status (e.g. today's date) */
  prefix?: ReactNode;
}) {
  const clock = useViewerClock();

  function localTime(day: DayOfWeek, time: string): string {
    const { hour, minute } = localHourMinute(day, time);
    return formatHourMinute(hour, minute);
  }
  function localRange(day: DayOfWeek, start: string, end: string) {
    return `${localTime(day, start)} – ${localTime(day, end)}`;
  }

  const todayEntries = clock.day
    ? entries
        .filter((e) => e.day === clock.day)
        .sort((a, b) => toMin(a.start) - toMin(b.start))
    : [];
  const activeEntry = todayEntries.find(
    (e) => clock.minutes >= toMin(e.start) && clock.minutes < toMin(e.end),
  );
  const nextEntry = todayEntries.find((e) => toMin(e.start) > clock.minutes);
  const spotlight = activeEntry ?? nextEntry;
  const minsUntilSpotlight = spotlight
    ? toMin(spotlight.start) - clock.minutes
    : Infinity;
  const showJoinLink =
    !!spotlight?.zoomLink && (!!activeEntry || minsUntilSpotlight <= 15);

  if (!clock.ready) {
    return (
      <div className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border bg-primary/5 px-3 py-2 text-sm">
        {prefix}
        <span className="text-muted-foreground">{loadingLabel ?? "…"}</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border bg-primary/5 px-3 py-2 text-sm">
      {prefix}
      {spotlight ? (
        <>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-bold",
              activeEntry
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {activeEntry ? "الآن" : "القادمة"}
          </span>
          <span className="font-semibold">{spotlight.subject}</span>
          {zoomLabel && showJoinLink && spotlight.zoomPasscode && (
            <span dir="ltr" className="text-xs text-muted-foreground">
              كلمة السر: {spotlight.zoomPasscode}
            </span>
          )}
          <span dir="ltr" className="text-xs text-muted-foreground">
            {localRange(spotlight.day, spotlight.start, spotlight.end)}
          </span>
          {zoomLabel && showJoinLink && (
            <a
              href={spotlight.zoomLink!}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              {zoomLabel} 🔗
            </a>
          )}
        </>
      ) : (
        <span className="text-muted-foreground">{emptyLabel}</span>
      )}
    </div>
  );
}
