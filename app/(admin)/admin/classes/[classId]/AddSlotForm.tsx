"use client";

import { useRef, useTransition } from "react";
import { DAYS, DAY_LABELS } from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddSlotForm({
  classId,
  subjects,
  teachers,
  action,
}: {
  classId: number;
  subjects: { id: string; label: string }[];
  teachers: { id: number; name: string }[];
  action: (formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(async () => {
          await action(formData);
          formRef.current?.reset();
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
          className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value="">اختر المادة...</option>
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
          className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
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
          className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
        >
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {DAY_LABELS[d]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="start_time">من</Label>
        <Input id="start_time" name="start_time" type="time" required dir="ltr" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="end_time">إلى</Label>
        <Input id="end_time" name="end_time" type="time" required dir="ltr" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="zoom_link">رابط Zoom (اختياري)</Label>
        <Input
          id="zoom_link"
          name="zoom_link"
          type="url"
          dir="ltr"
          placeholder="https://zoom.us/j/..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="zoom_meeting_id">Meeting ID (اختياري)</Label>
        <Input id="zoom_meeting_id" name="zoom_meeting_id" dir="ltr" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="zoom_passcode">Passcode (اختياري)</Label>
        <Input id="zoom_passcode" name="zoom_passcode" dir="ltr" />
      </div>

      <div className="flex items-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "جاري الإضافة..." : "إضافة الحصة"}
        </Button>
      </div>
    </form>
  );
}
