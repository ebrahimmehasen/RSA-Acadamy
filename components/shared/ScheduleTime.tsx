"use client";

import { useEffect, useState } from "react";
import { formatHourMinute, formatTime, type DayOfWeek } from "@/lib/schedule";
import { localHourMinute } from "@/lib/timezone";

/**
 * Renders a schedule slot's start–end time, converted to the viewer's
 * own local timezone when it differs from Cairo (school time) — e.g.
 * once Egypt's daylight saving ends while Saudi Arabia stays fixed.
 * Falls back to the plain Cairo time on the server / before mount,
 * since the conversion needs the browser's own timezone.
 */
export function ScheduleTime({
  dayOfWeek,
  startTime,
  endTime,
}: {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}) {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const cairoLabel = `${formatTime(startTime)} – ${formatTime(endTime)}`;
  if (!mounted) return <span dir="ltr">{cairoLabel}</span>;

  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const local = {
    start: localHourMinute(dayOfWeek, startTime),
    end: localHourMinute(dayOfWeek, endTime),
  };
  const sameAsCairo =
    local.start.hour === sh &&
    local.start.minute === sm &&
    local.end.hour === eh &&
    local.end.minute === em;

  if (sameAsCairo) return <span dir="ltr">{cairoLabel}</span>;

  const localLabel = `${formatHourMinute(local.start.hour, local.start.minute)} – ${formatHourMinute(local.end.hour, local.end.minute)}`;

  return (
    <span dir="ltr">
      {localLabel}{" "}
      <span className="text-xs text-muted-foreground">
        (بتوقيت القاهرة: {cairoLabel})
      </span>
    </span>
  );
}
