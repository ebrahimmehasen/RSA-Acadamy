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
import { uploadSession, type UploadResult } from "./actions";

export function UploadSessionForm({
  slots,
}: {
  slots: {
    classId: number;
    className: string;
    subjectId: string;
    subjectName: string;
  }[];
}) {
  const [result, formAction, isPending] = useActionState<
    UploadResult | null,
    FormData
  >(uploadSession, null);
  const [selection, setSelection] = useState("");

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
