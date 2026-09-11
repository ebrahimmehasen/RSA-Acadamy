"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DAYS, DAY_LABELS, PERIODS, formatTime, type DayOfWeek } from "@/lib/schedule";
import { saveAvailability, type PreferencesResult } from "./actions";

export function AvailabilityForm({
  initialSlots,
}: {
  /** existing (day, period-start) pairs already saved */
  initialSlots: Set<string>;
}) {
  const [result, formAction, isPending] = useActionState<
    PreferencesResult | null,
    FormData
  >(saveAvailability, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-3">
        {DAYS.map((day: DayOfWeek) => (
          <div key={day} className="space-y-1.5 rounded-lg border p-3">
            <p className="text-sm font-semibold">{DAY_LABELS[day]}</p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {PERIODS.map((p) => {
                const key = `${day}|${p.start}`;
                return (
                  <label
                    key={key}
                    className="flex min-h-8 items-center gap-2 text-xs"
                  >
                    <Checkbox
                      name="slots"
                      value={key}
                      defaultChecked={initialSlots.has(key)}
                    />
                    <span dir="ltr" className="text-muted-foreground">
                      {formatTime(p.start)}–{formatTime(p.end)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {result && (
        <p
          className={`text-sm ${result.ok ? "text-green-600" : "text-destructive"}`}
          aria-live="polite"
        >
          {result.message}
        </p>
      )}
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "جاري الحفظ…" : "حفظ الأوقات"}
      </Button>
    </form>
  );
}
