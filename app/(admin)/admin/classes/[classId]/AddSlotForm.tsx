"use client";

import { useRef, useState, useTransition } from "react";
import { DAYS, DAY_LABELS, PERIODS, formatTime, periodValue, type DayOfWeek } from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SELECT_CLASS } from "@/lib/ui";

export function AddSlotForm({
  classId,
  subjects,
  teachers,
  zoomAccounts,
  action,
  defaultDay,
  defaultPeriod,
}: {
  classId: number;
  subjects: { id: string; label: string }[];
  teachers: { id: number; name: string }[];
  zoomAccounts: { id: number; label: string }[];
  action: (formData: FormData) => Promise<void>;
  /** preselect day/period — used when "adding" starts from a specific grid cell */
  defaultDay?: DayOfWeek;
  defaultPeriod?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [timingMode, setTimingMode] = useState<"period" | "custom">("period");

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(async () => {
          await action(formData);
          formRef.current?.reset();
          setTimingMode("period");
        })
      }
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <input type="hidden" name="class_id" value={classId} />

      <div className="space-y-2">
        <Label htmlFor="subject_id">المادة</Label>
        <select
          id="subject_id"
          name="subject_id"
          required
          className={SELECT_CLASS}
        >
          <option value="">اختر المادة…</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="teacher_id">المدرس</Label>
        <select
          id="teacher_id"
          name="teacher_id"
          className={SELECT_CLASS}
        >
          <option value="">غير محدد</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="day_of_week">اليوم</Label>
        <select
          id="day_of_week"
          name="day_of_week"
          required
          defaultValue={defaultDay}
          className={SELECT_CLASS}
        >
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {DAY_LABELS[d]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 sm:col-span-2 lg:col-span-3">
        <Label>موعد الحصة</Label>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="timing_mode"
              value="period"
              checked={timingMode === "period"}
              onChange={() => setTimingMode("period")}
            />
            حصة ضمن الجدول الثابت
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="timing_mode"
              value="custom"
              checked={timingMode === "custom"}
              onChange={() => setTimingMode("custom")}
            />
            موعد مختلف (حصة خاصة / إضافية)
          </label>
        </div>
      </div>

      {timingMode === "period" ? (
        <div className="space-y-2">
          <Label htmlFor="period">الحصة</Label>
          <select
            id="period"
            name="period"
            required
            defaultValue={defaultPeriod}
            className={SELECT_CLASS}
          >
            {PERIODS.map((p) => (
              <option key={periodValue(p)} value={periodValue(p)}>
                {p.label} ({formatTime(p.start)}–{formatTime(p.end)})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="custom_start_time">من</Label>
            <Input
              id="custom_start_time"
              name="custom_start_time"
              type="time"
              dir="ltr"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom_end_time">إلى</Label>
            <Input
              id="custom_end_time"
              name="custom_end_time"
              type="time"
              dir="ltr"
              required
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="zoom_account_id">حساب Zoom (اختياري)</Label>
        <select
          id="zoom_account_id"
          name="zoom_account_id"
          className={SELECT_CLASS}
        >
          <option value="">بدون رابط</option>
          {zoomAccounts.map((z) => (
            <option key={z.id} value={z.id}>
              {z.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "جاري الإضافة…" : "إضافة الحصة"}
        </Button>
      </div>
    </form>
  );
}
