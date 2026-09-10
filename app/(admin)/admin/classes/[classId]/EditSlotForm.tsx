"use client";

import { useState, useTransition } from "react";
import { DAYS, DAY_LABELS, PERIODS, formatTime, periodValue } from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SELECT_CLASS } from "@/lib/ui";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function EditSlotForm({
  slot,
  classId,
  subjects,
  teachers,
  zoomAccounts,
  action,
}: {
  slot: {
    id: number;
    subject_id: string;
    teacher_id: number | null;
    day_of_week: (typeof DAYS)[number];
    start_time: string;
    end_time: string;
  };
  classId: number;
  subjects: { id: string; label: string }[];
  teachers: { id: number; name: string }[];
  zoomAccounts: { id: number; label: string }[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const currentPeriod = `${slot.start_time.slice(0, 5)}-${slot.end_time.slice(0, 5)}`;
  const isFixedPeriod = PERIODS.some((p) => periodValue(p) === currentPeriod);
  const [timingMode, setTimingMode] = useState<"period" | "custom">(
    isFixedPeriod ? "period" : "custom",
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="xs" />}>
        تعديل
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>تعديل الحصة</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) =>
            startTransition(async () => {
              await action(formData);
              setOpen(false);
            })
          }
          className="grid gap-4 sm:grid-cols-2"
        >
          <input type="hidden" name="id" value={slot.id} />
          <input type="hidden" name="class_id" value={classId} />

          <div className="space-y-2">
            <Label htmlFor={`subject_id-${slot.id}`}>المادة</Label>
            <select
              id={`subject_id-${slot.id}`}
              name="subject_id"
              required
              defaultValue={slot.subject_id}
              className={SELECT_CLASS}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`teacher_id-${slot.id}`}>المدرس</Label>
            <select
              id={`teacher_id-${slot.id}`}
              name="teacher_id"
              defaultValue={slot.teacher_id ?? ""}
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
            <Label htmlFor={`day_of_week-${slot.id}`}>اليوم</Label>
            <select
              id={`day_of_week-${slot.id}`}
              name="day_of_week"
              required
              defaultValue={slot.day_of_week}
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
              <Label htmlFor={`period-${slot.id}`}>الحصة</Label>
              <select
                id={`period-${slot.id}`}
                name="period"
                required
                defaultValue={isFixedPeriod ? currentPeriod : undefined}
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
                <Label htmlFor={`custom_start_time-${slot.id}`}>من</Label>
                <Input
                  id={`custom_start_time-${slot.id}`}
                  name="custom_start_time"
                  type="time"
                  dir="ltr"
                  required
                  defaultValue={slot.start_time.slice(0, 5)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`custom_end_time-${slot.id}`}>إلى</Label>
                <Input
                  id={`custom_end_time-${slot.id}`}
                  name="custom_end_time"
                  type="time"
                  dir="ltr"
                  required
                  defaultValue={slot.end_time.slice(0, 5)}
                />
              </div>
            </>
          )}

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`zoom_account_id-${slot.id}`}>رابط Zoom</Label>
            <select
              id={`zoom_account_id-${slot.id}`}
              name="zoom_account_id"
              defaultValue="keep"
              className={SELECT_CLASS}
            >
              <option value="keep">إبقاء الرابط الحالي بدون تغيير</option>
              <option value="none">إزالة الرابط</option>
              {zoomAccounts.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter className="sm:col-span-2">
            <DialogClose render={<Button type="button" variant="outline" />}>
              إلغاء
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "جاري الحفظ…" : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
