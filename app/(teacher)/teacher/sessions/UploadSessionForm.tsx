"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { uploadSession, type UploadResult } from "./actions";

type Access = "class" | "students";

export function UploadSessionForm({
  slots,
  studentsByClass,
}: {
  slots: {
    classId: number;
    className: string;
    subjectId: string;
    subjectName: string;
  }[];
  studentsByClass: Record<number, { id: number; name: string }[]>;
}) {
  const [result, formAction, isPending] = useActionState<
    UploadResult | null,
    FormData
  >(uploadSession, null);
  const [selection, setSelection] = useState("");
  const [access, setAccess] = useState<Access>("class");
  const classId = Number(selection.split("|")[0] ?? 0);
  const students = studentsByClass[classId] ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">رفع حصة مسجلة</CardTitle>
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
            <Label htmlFor="title">عنوان الحصة</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">وصف (اختياري)</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>

          <div className="space-y-2">
            <Label>مين يقدر يشوف الحصة؟</Label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="access_mode"
                  checked={access === "class"}
                  onChange={() => setAccess("class")}
                />
                كل طلاب الفصل
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="access_mode"
                  checked={access === "students"}
                  onChange={() => setAccess("students")}
                />
                طلاب محددين
              </label>
            </div>
            <input type="hidden" name="is_public" value={access === "class" ? "true" : "false"} />
          </div>

          {access === "students" && (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
              {students.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  اختر الفصل الأول
                </p>
              )}
              {students.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <Checkbox name="accessible_students" value={String(s.id)} />
                  {s.name}
                </label>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="video">ملف الفيديو (MP4/WebM)</Label>
            <Input id="video" name="video" type="file" accept="video/mp4,video/webm" required />
          </div>

          {result && (
            <p
              className={`text-sm ${result.ok ? "text-green-600" : "text-destructive"}`}
            >
              {result.message}
            </p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "جاري الرفع... قد يستغرق وقت حسب حجم الفيديو" : "رفع الحصة"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
