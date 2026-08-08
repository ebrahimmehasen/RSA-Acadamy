"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createAssignment, type ActionResult } from "./actions";

export function CreateAssignmentForm({
  slots,
}: {
  slots: { classId: number; className: string; subjectId: string; subjectName: string }[];
}) {
  const [result, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(createAssignment, null);
  const [selection, setSelection] = useState("");
  const [dueLocal, setDueLocal] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">إنشاء واجب جديد</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slot">الفصل والمادة</Label>
            <select
              id="slot"
              value={selection}
              onChange={(e) => setSelection(e.target.value)}
              required
              className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
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

          <div className="space-y-2">
            <Label htmlFor="title">عنوان الواجب</Label>
            <Input id="title" name="title" required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="due_date">آخر موعد للتسليم</Label>
              <Input
                id="due_date"
                type="datetime-local"
                dir="ltr"
                required
                value={dueLocal}
                onChange={(e) => setDueLocal(e.target.value)}
              />
              {/* datetime-local has no timezone info — convert to a real
                  ISO instant here (in the browser, where the local
                  timezone is actually known) instead of sending the raw
                  string for the server to misparse as UTC. */}
              <input
                type="hidden"
                name="due_date"
                value={dueLocal ? new Date(dueLocal).toISOString() : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_grade">الدرجة العظمى</Label>
              <Input
                id="max_grade"
                name="max_grade"
                type="number"
                min={1}
                max={100}
                defaultValue={100}
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">الوصف</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">التعليمات</Label>
            <Textarea id="instructions" name="instructions" rows={2} />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="allow_file" defaultChecked />
              يسمح برفع ملف
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="allow_text" defaultChecked />
              يسمح بإجابة نصية
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachments">
              مرفقات (حد أقصى 3 ملفات، 50MB إجمالي)
            </Label>
            <Input id="attachments" name="attachments" type="file" multiple />
          </div>

          {result && (
            <p
              className={`text-sm ${result.ok ? "text-green-600" : "text-destructive"}`}
            >
              {result.message}
            </p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "جاري الإنشاء..." : "إنشاء الواجب"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
