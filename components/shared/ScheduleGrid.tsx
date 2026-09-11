"use client";

import { type ReactNode } from "react";
import {
  DAYS,
  DAY_LABELS,
  PERIODS,
  formatHourMinute,
  formatTime,
  type DayOfWeek,
} from "@/lib/schedule";
import {
  SCHOOL_TIMEZONE,
  localHourMinute,
  timezoneLabel,
} from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { useViewerClock, ScheduleSpotlight } from "@/components/shared/ScheduleSpotlight";

export interface ScheduleGridEntry {
  id: string | number;
  day: DayOfWeek;
  /** "HH:MM" or "HH:MM:SS" — wall-clock time in the school timezone */
  start: string;
  end: string;
  /** primary line — the subject / lesson */
  subject: string;
  /** secondary muted line — teacher name, class name, … */
  sub?: ReactNode;
  zoomLink?: string | null;
  /** shown next to the class name in the "today" box, with the join link */
  zoomPasscode?: string | null;
}

const hhmm = (t: string) => t.slice(0, 5);
const toMin = (t: string) => {
  const [h, m] = hhmm(t).split(":").map(Number);
  return h * 60 + m;
};
const FALLBACK_DAYS: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
];

/**
 * The weekly timetable, drawn as an actual matrix: period columns across
 * the top (each labelled with its name and time), day rows down the
 * side, each cell holding the lesson(s) for that day + period.
 *
 * - Today's row and the period running right now are shaded; their
 *   intersection — the lesson happening now — is emphasised.
 * - A "today" box above the grid spotlights the live (or next) class
 *   with its join link.
 * - All times are shown in the viewer's own timezone (Egypt / Saudi /
 *   …), converted from the school's Cairo wall-clock.
 * - Custom-timed extra sessions are listed under the grid.
 */
export function ScheduleGrid({
  entries,
  zoomLabel,
  entryActions,
  caption,
}: {
  entries: ScheduleGridEntry[];
  /** when set, the "today" box shows a join link with this label */
  zoomLabel?: string;
  /** extra controls per entry, keyed by entry id (e.g. the admin edit / delete buttons) */
  entryActions?: Record<string | number, ReactNode>;
  /** an extra note shown before the auto timezone line */
  caption?: ReactNode;
}) {
  const clock = useViewerClock();

  const days = DAYS.filter((d) => entries.some((e) => e.day === d));
  const shownDays = days.length > 0 ? days : FALLBACK_DAYS;
  const refDay = clock.day ?? shownDays[0] ?? "sunday";

  const periodStarts = new Set<string>(PERIODS.map((p) => p.start));
  const extras = entries.filter((e) => !periodStarts.has(hhmm(e.start)));

  const activePeriodIndex = clock.ready
    ? PERIODS.findIndex(
        (p) => clock.minutes >= toMin(p.start) && clock.minutes < toMin(p.end),
      )
    : -1;

  /** Cairo "HH:MM" → the viewer's local "h:mm ص/م" (Cairo before mount). */
  function localTime(day: DayOfWeek, time: string): string {
    if (!clock.ready) return formatTime(time);
    const { hour, minute } = localHourMinute(day, time);
    return formatHourMinute(hour, minute);
  }
  function localRange(day: DayOfWeek, start: string, end: string) {
    return `${localTime(day, start)} – ${localTime(day, end)}`;
  }

  function cellEntries(day: DayOfWeek, periodStart: string) {
    return entries.filter(
      (e) => e.day === day && hhmm(e.start) === periodStart,
    );
  }

  function Entry({ entry }: { entry: ScheduleGridEntry }) {
    return (
      <div className="space-y-1 rounded-md bg-muted/50 p-2">
        <p className="text-[0.8rem] leading-tight font-semibold">
          {entry.subject}
        </p>
        {entry.sub != null && (
          <p className="text-xs text-muted-foreground">{entry.sub}</p>
        )}
        {entryActions?.[entry.id] != null && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {entryActions[entry.id]}
          </div>
        )}
      </div>
    );
  }

  // "Today at a glance" — the class running now (or the next one today).
  const dateLabel = clock.ready
    ? new Intl.DateTimeFormat("ar-EG", {
        timeZone: SCHOOL_TIMEZONE,
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date())
    : null;
  const tzName = clock.ready ? timezoneLabel(clock.tz) : "مصر";

  return (
    <div className="flex flex-col gap-3">
      <ScheduleSpotlight
        entries={entries}
        zoomLabel={zoomLabel}
        prefix={
          <span className="font-medium">
            📅 {dateLabel ?? <span className="text-muted-foreground">…</span>}
          </span>
        }
      />

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky start-0 z-10 border bg-muted/60 p-2 text-start text-xs font-semibold whitespace-nowrap text-muted-foreground">
                  اليوم
                </th>
                {PERIODS.map((p, pi) => {
                  const activeCol = pi === activePeriodIndex;
                  return (
                    <th
                      key={p.start}
                      className={cn(
                        "border bg-muted/60 p-2 text-center align-top whitespace-nowrap",
                        activeCol && "bg-primary/10",
                      )}
                    >
                      <span className="block font-semibold">{p.label}</span>
                      <span
                        className="mt-0.5 block text-xs font-normal text-muted-foreground"
                        dir="ltr"
                      >
                        {localRange(refDay, p.start, p.end)}
                      </span>
                      {activeCol && (
                        <span className="mt-1 inline-block rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                          الآن
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {shownDays.map((d) => {
                const isToday = clock.ready && d === clock.day;
                return (
                  <tr key={d}>
                    <th
                      scope="row"
                      className={cn(
                        "sticky start-0 z-10 border bg-muted/40 p-2 text-start align-top font-medium whitespace-nowrap",
                        isToday && "bg-primary/10 text-primary",
                      )}
                    >
                      {DAY_LABELS[d]}
                      {isToday && (
                        <span className="mt-1 block text-[10px] font-bold">
                          اليوم
                        </span>
                      )}
                    </th>
                    {PERIODS.map((p, pi) => {
                      const cell = cellEntries(d, p.start);
                      const activeCol = pi === activePeriodIndex;
                      const isLiveCell = isToday && activeCol;
                      return (
                        <td
                          key={p.start}
                          aria-current={isLiveCell ? "time" : undefined}
                          className={cn(
                            "border p-1.5 align-top",
                            cell.length === 0 && "text-center",
                            isToday && "bg-primary/[0.04]",
                            activeCol && "bg-primary/[0.06]",
                            isLiveCell &&
                              "bg-primary/12 ring-2 ring-primary/50 ring-inset",
                          )}
                        >
                          {cell.length === 0 ? (
                            <span className="text-muted-foreground/40">—</span>
                          ) : (
                            <div className="space-y-1.5">
                              {cell.map((entry) => (
                                <Entry key={entry.id} entry={entry} />
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {extras.length > 0 && (
          <div className="border-t p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              حصص بمواعيد خاصة
            </p>
            <ul className="space-y-1.5 text-sm">
              {extras.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1"
                >
                  <span className="font-medium">{DAY_LABELS[entry.day]}</span>
                  <span dir="ltr" className="text-xs text-muted-foreground">
                    {localRange(entry.day, entry.start, entry.end)}
                  </span>
                  <span>·</span>
                  <span>{entry.subject}</span>
                  {entry.sub != null && (
                    <span className="text-xs text-muted-foreground">
                      ({entry.sub})
                    </span>
                  )}
                  {entryActions?.[entry.id] != null && (
                    <span className="flex flex-wrap gap-1">
                      {entryActions[entry.id]}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="border-t px-3 py-2 text-xs text-muted-foreground">
          {caption && <>{caption} · </>}
          التوقيتات بتوقيت {tzName}
        </p>
      </div>
    </div>
  );
}
