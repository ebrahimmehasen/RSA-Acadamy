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
import { createQuiz, type ActionResult } from "./actions";

export function CreateQuizForm({
  slots,
  assignments,
}: {
  slots: {
    classId: number;
    className: string;
    subjectId: string;
    subjectName: string;
  }[];
  assignments: {
    id: number;
    title: string;
    classId: number;
    subjectId: string;
  }[];
}) {
  const [result, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(createQuiz, null);
  const [selection, setSelection] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [classId, subjectId] = selection.split("|");
  const matchingAssignments = assignments.filter(
    (a) => String(a.classId) === classId && a.subjectId === subjectId,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">إنشاء اختبار جديد</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="slot">الفصل والمادة</Label>
            <select
              id="slot"
              value={selection}
              onChange={(e) => setSelection(e.target.value)}
              required
              className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
            >
              <option value="">اختر...</option>
              {slots.map((s) => (
                <option
                  key={`${s.classId}-${s.subjectId}`}
                  value={`${s.classId}|${s.subjectId}`}
                >
                  {s.className} — {s.subjectName}
                </option>
              ))}
            </select>
            <input
              type="hidden"
              name="class_id"
              value={selection.split("|")[0] ?? ""}
            />
            <input
              type="hidden"
              name="subject_id"
              value={selection.split("|")[1] ?? ""}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">عنوان الاختبار</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="total_points">الدرجة الكلية</Label>
            <Input
              id="total_points"
              name="total_points"
              type="number"
              defaultValue={100}
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration_minutes">المدة (دقائق)</Label>
            <Input
              id="duration_minutes"
              name="duration_minutes"
              type="number"
              required
              dir="ltr"
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
            {/* datetime-local has no timezone info — convert to a real
                ISO instant here (in the browser, where the local
                timezone is actually known) instead of sending the raw
                string for the server to misparse as UTC. */}
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
            <Textarea id="description" name="description" rows={2} />
          </div>
          {matchingAssignments.length > 0 && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="assignment_id">مرتبط بواجب (اختياري)</Label>
              <select
                id="assignment_id"
                name="assignment_id"
                className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
              >
                <option value="">اختبار مستقل (غير مرتبط)</option>
                {matchingAssignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              id="shuffle_questions"
              name="shuffle_questions"
            />
            <label htmlFor="shuffle_questions">ترتيب عشوائي للأسئلة</label>
          </div>
          {result && !result.ok && (
            <p className="text-sm text-destructive sm:col-span-2" aria-live="polite">
              {result.message}
            </p>
          )}
          <div className="flex items-end justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "جاري الإنشاء…" : "إنشاء ومتابعة إضافة الأسئلة"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
