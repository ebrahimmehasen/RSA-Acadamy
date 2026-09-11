"use client";

import { useRef, useState, useTransition } from "react";
import { DAYS, DAY_LABELS, PERIODS, formatTime, periodValue, type DayOfWeek } from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SELECT_CLASS } from "@/lib/ui";

export function TeacherAddSlotForm({
  teacherId,
  classes,
  subjectsByClass,
  zoomAccounts,
  action,
  defaultDay,
  defaultPeriod,
  onDone,
}: {
  teacherId: number;
  classes: { id: number; class_name: string }[];
  subjectsByClass: Record<number, { id: string; label: string }[]>;
  zoomAccounts: { id: number; label: string }[];
  action: (formData: FormData) => Promise<void>;
  defaultDay?: DayOfWeek;
  defaultPeriod?: string;
  /** called after a successful add — lets a dialog wrapper close itself */
  onDone?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [timingMode, setTimingMode] = useState<"period" | "custom">("period");
  const [classId, setClassId] = useState<number | "">(classes[0]?.id ?? "");
  const subjectOptions = classId ? (subjectsByClass[classId] ?? []) : [];

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(async () => {
          await action(formData);
          formRef.current?.reset();
          setTimingMode("period");
          onDone?.();
        })
      }
      className="grid gap-4 sm:grid-cols-2"
    >
      <input type="hidden" name="teacher_id" value={teacherId} />

      <div className="space-y-2">
        <Label htmlFor="class_id">الفصل</Label>
        <select
          id="class_id"
          name="class_id"
          required
          value={classId}
          onChange={(e) => setClassId(Number(e.target.value))}
          className={SELECT_CLASS}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.class_name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject_id">المادة</Label>
        <select id="subject_id" name="subject_id" required className={SELECT_CLASS}>
          <option value="">اختر المادة…</option>
          {subjectOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
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

      <div className="space-y-2 sm:col-span-2">
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
        <div className="space-y-2 sm:col-span-2">
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

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="zoom_account_id">حساب Zoom (اختياري)</Label>
        <select id="zoom_account_id" name="zoom_account_id" className={SELECT_CLASS}>
          <option value="">بدون رابط</option>
          {zoomAccounts.map((z) => (
            <option key={z.id} value={z.id}>
              {z.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "جاري الإضافة…" : "إضافة الحصة"}
        </Button>
      </div>
    </form>
  );
}
