"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
import { uploadSessionVideo } from "@/lib/submissionUploader";
import { formatFileSize } from "@/lib/uploadLimits";

interface UploadResult {
  ok: boolean;
  message: string;
}

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
  const router = useRouter();
  const [result, setResult] = useState<UploadResult | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [selection, setSelection] = useState("");
  const [access, setAccess] = useState<Access>("class");
  const classId = Number(selection.split("|")[0] ?? 0);
  const students = studentsByClass[classId] ?? [];

  // The video goes straight from the browser to Drive in chunks (a server
  // action can't carry it); the session row is created once Drive has it all.
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const video = fd.get("video");
    if (!(video instanceof File) || video.size === 0) {
      setResult({ ok: false, message: "ارفع ملف فيديو" });
      return;
    }
    setResult(null);
    setIsPending(true);
    setProgress({ done: 0, total: video.size });
    try {
      await uploadSessionVideo(
        video,
        {
          classId: Number(fd.get("class_id")),
          subjectId: String(fd.get("subject_id") ?? ""),
          title: String(fd.get("title") ?? ""),
          description: String(fd.get("description") ?? ""),
          isPublic: fd.get("is_public") !== "false",
          accessibleStudents: fd.getAll("accessible_students").map(Number),
        },
        (done) => setProgress({ done, total: video.size }),
      );
      form.reset();
      setSelection("");
      setResult({ ok: true, message: "تم رفع الحصة ✅" });
      router.refresh();
    } catch (error) {
      setResult({
        ok: false,
        message: error instanceof Error ? error.message : "فشل رفع الحصة",
      });
    } finally {
      setIsPending(false);
      setProgress(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">رفع حصة مسجلة</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slot">الفصل والمادة</Label>
            <select
              id="slot"
              value={selection}
              onChange={(e) => setSelection(e.target.value)}
              required
              className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
            >
              <option value="">اختر…</option>
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
            <Label>من يمكنه مشاهدة الحصة؟</Label>
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

          {progress && (
            <div className="space-y-1" role="status" aria-live="polite">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-[width]"
                  style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                />
              </div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                {formatFileSize(progress.done)} / {formatFileSize(progress.total)} — لا تغلق الصفحة
              </p>
            </div>
          )}

          {result && (
            <p
              className={`text-sm ${result.ok ? "text-green-600" : "text-destructive"}`}
              aria-live="polite"
            >
              {result.message}
            </p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "جاري الرفع…" : "رفع الحصة"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
