import type { ReactNode } from "react";
import {
  DAYS,
  DAY_LABELS,
  PERIODS,
  formatTime,
  type DayOfWeek,
} from "@/lib/schedule";
import { cn } from "@/lib/utils";

export interface ScheduleGridEntry {
  id: string | number;
  day: DayOfWeek;
  /** "HH:MM" or "HH:MM:SS" */
  start: string;
  end: string;
  /** primary line — the subject / lesson */
  subject: string;
  /** secondary muted line — teacher name, class name, passcode, … */
  sub?: ReactNode;
  zoomLink?: string | null;
}

const hhmm = (t: string) => t.slice(0, 5);
const FALLBACK_DAYS: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
];

/**
 * The weekly timetable, drawn as an actual matrix: day columns × period
 * rows, each row labelled with the period name and its Cairo time, each
 * cell holding the lesson(s) for that day + period. Shared by every
 * schedule view (admin class page, student, teacher, parent).
 *
 * Slots whose start time doesn't line up with one of the six fixed
 * PERIODS (a custom-timed extra session) are listed under the grid
 * instead of forced into a row.
 */
export function ScheduleGrid<T extends ScheduleGridEntry>({
  entries,
  zoomLabel,
  renderEntryActions,
  caption = "كل الأوقات بتوقيت القاهرة",
}: {
  entries: T[];
  /** when set, each entry that has a zoomLink shows a join link with this label */
  zoomLabel?: string;
  /** extra controls under each entry (e.g. the admin edit / delete buttons) */
  renderEntryActions?: (entry: T) => ReactNode;
  caption?: ReactNode;
}) {
  const days = DAYS.filter((d) => entries.some((e) => e.day === d));
  const shownDays = days.length > 0 ? days : FALLBACK_DAYS;

  const periodStarts = new Set<string>(PERIODS.map((p) => p.start));
  const extras = entries.filter((e) => !periodStarts.has(hhmm(e.start)));

  function cellEntries(day: DayOfWeek, periodStart: string) {
    return entries.filter(
      (e) => e.day === day && hhmm(e.start) === periodStart,
    );
  }

  function Entry({ entry }: { entry: T }) {
    return (
      <div className="space-y-1 rounded-md bg-muted/50 p-2">
        <p className="text-[0.8rem] leading-tight font-semibold">
          {entry.subject}
        </p>
        {entry.sub != null && (
          <p className="text-xs text-muted-foreground">{entry.sub}</p>
        )}
        {zoomLabel && entry.zoomLink && (
          <a
            href={entry.zoomLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs font-medium text-primary underline underline-offset-2"
          >
            {zoomLabel} 🔗
          </a>
        )}
        {renderEntryActions && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {renderEntryActions(entry)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky start-0 z-10 border bg-muted/60 p-2 text-start text-xs font-semibold whitespace-nowrap text-muted-foreground">
                الحصة
              </th>
              {shownDays.map((d) => (
                <th
                  key={d}
                  className="border bg-muted/60 p-2 text-center font-semibold whitespace-nowrap"
                >
                  {DAY_LABELS[d]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((p) => (
              <tr key={p.start}>
                <th
                  scope="row"
                  className="sticky start-0 z-10 border bg-muted/40 p-2 text-start align-top whitespace-nowrap"
                >
                  <span className="block font-medium">{p.label}</span>
                  <span
                    className="mt-0.5 block text-xs font-normal text-muted-foreground"
                    dir="ltr"
                  >
                    {formatTime(p.start)} – {formatTime(p.end)}
                  </span>
                </th>
                {shownDays.map((d) => {
                  const cell = cellEntries(d, p.start);
                  return (
                    <td
                      key={d}
                      className={cn(
                        "border p-1.5 align-top",
                        cell.length === 0 && "text-center",
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
            ))}
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
                  {formatTime(entry.start)} – {formatTime(entry.end)}
                </span>
                <span>·</span>
                <span>{entry.subject}</span>
                {entry.sub != null && (
                  <span className="text-xs text-muted-foreground">
                    ({entry.sub})
                  </span>
                )}
                {zoomLabel && entry.zoomLink && (
                  <a
                    href={entry.zoomLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-primary underline underline-offset-2"
                  >
                    {zoomLabel} 🔗
                  </a>
                )}
                {renderEntryActions && (
                  <span className="flex flex-wrap gap-1">
                    {renderEntryActions(entry)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {caption && (
        <p className="border-t px-3 py-2 text-xs text-muted-foreground">
          {caption}
        </p>
      )}
    </div>
  );
}
