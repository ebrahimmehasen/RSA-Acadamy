"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateQuiz, type UpdateQuizResult } from "../actions";

/** "2026-08-08T20:09" (no timezone) → local Date parts for the input's defaultValue. */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function EditQuizForm({
  quizId,
  title,
  description,
  totalPoints,
  durationMinutes,
  startTime,
  endTime,
}: {
  quizId: number;
  title: string;
  description: string | null;
  totalPoints: number;
  durationMinutes: number;
  startTime: string;
  endTime: string;
}) {
  const [result, formAction, isPending] = useActionState<
    UpdateQuizResult | null,
    FormData
  >(updateQuiz, null);
  const [startLocal, setStartLocal] = useState(toLocalInputValue(startTime));
  const [endLocal, setEndLocal] = useState(toLocalInputValue(endTime));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">تعديل بيانات الاختبار</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="quiz_id" value={quizId} />

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">عنوان الاختبار</Label>
            <Input id="title" name="title" defaultValue={title} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="total_points">الدرجة الكلية</Label>
            <Input
              id="total_points"
              name="total_points"
              type="number"
              defaultValue={totalPoints}
              dir="ltr"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration_minutes">المدة (دقائق)</Label>
            <Input
              id="duration_minutes"
              name="duration_minutes"
              type="number"
              defaultValue={durationMinutes}
              dir="ltr"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_time">وقت البداية</Label>
            <Input
              id="start_time"
              type="datetime-local"
              required
              dir="ltr"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
            />
            <input
              type="hidden"
              name="start_time"
              value={startLocal ? new Date(startLocal).toISOString() : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_time">وقت النهاية</Label>
            <Input
              id="end_time"
              type="datetime-local"
              required
              dir="ltr"
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
            />
            <input
              type="hidden"
              name="end_time"
              value={endLocal ? new Date(endLocal).toISOString() : ""}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">الوصف (اختياري)</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={description ?? ""}
            />
          </div>

          {result && (
            <p
              className={`text-sm sm:col-span-2 ${result.ok ? "text-green-600" : "text-destructive"}`}
            >
              {result.message}
            </p>
          )}

          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
