"use client";

import {
  useActionState,
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionCard } from "@/components/shared/SectionCard";
import { SELECT_CLASS } from "@/lib/ui";
import {
  ASSIGNMENT_ATTACHMENT_LIMITS,
  TEACHER_ATTACHMENT_ALLOWED_MIMES,
  validateAssignmentAttachmentBatch,
} from "@/lib/uploadLimits";
import { uploadTeacherAttachmentFile } from "@/lib/submissionUploader";
import { AttachmentDropzone, useAttachmentQueue } from "@/components/shared/AttachmentUploader";
import { createAssignment, type ActionResult } from "./actions";

export function CreateAssignmentForm({
  slots,
}: {
  slots: {
    classId: number;
    className: string;
    subjectId: string;
    subjectName: string;
    /** set for a Private-lesson slot — the assignment then targets only that student */
    studentId: number | null;
    studentName: string | null;
  }[];
}) {
  const [result, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(createAssignment, null);
  const [selection, setSelection] = useState("");
  const [selClassId = "", selSubjectId = "", selStudentId = ""] = selection.split("|");
  const isPrivateSlot = selStudentId !== "";
  const [dueLocal, setDueLocal] = useState("");
  const queue = useAttachmentQueue({
    allowedMimes: TEACHER_ATTACHMENT_ALLOWED_MIMES,
    baseCount: 0,
    baseBytes: 0,
    validateBatch: validateAssignmentAttachmentBatch,
  });
  const [, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const busy = isPending || queue.uploading;

  // A successful create() means the queued files are now the assignment's
  // saved attachments — clear the picker so it's ready for a next one.
  useEffect(() => {
    if (result?.ok) queue.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Files go up in chunks first (a server action can't carry more than a
  // few MB), then the action just receives their ids.
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const formData = new FormData(e.currentTarget);
    setUploadError(null);
    let ids: string[];
    try {
      ids = await queue.uploadAll((file, onProgress) =>
        uploadTeacherAttachmentFile(file, null, onProgress),
      );
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "فشل رفع الملفات");
      return;
    }
    formData.set("new_file_ids", JSON.stringify(ids));
    startTransition(() => formAction(formData));
  }

  return (
    <>
      {busy && (
        <div
          role="status"
          aria-live="assertive"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm"
        >
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
          <p className="font-heading text-sm font-semibold">
            {queue.uploading
              ? `جاري رفع الملفات (${queue.doneCount}/${queue.items.length})…`
              : "جاري إنشاء الواجب…"}
          </p>
          {queue.uploading && queue.currentName && (
            <p className="max-w-xs truncate text-xs text-muted-foreground" dir="ltr">
              {queue.currentName}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            يرجى الانتظار وعدم إغلاق الصفحة أو تحديثها
          </p>
        </div>
      )}
      <SectionCard title="إنشاء واجب جديد">
        <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
          <div className="space-y-2">
            <Label htmlFor="slot">الفصل والمادة</Label>
            <select
              id="slot"
              value={selection}
              onChange={(e) => setSelection(e.target.value)}
              required
              className={SELECT_CLASS}
            >
              <option value="">اختر…</option>
              {slots.map((s) => (
                <option
                  key={`${s.classId}-${s.subjectId}-${s.studentId ?? ""}`}
                  value={`${s.classId}|${s.subjectId}|${s.studentId ?? ""}`}
                >
                  {s.className} — {s.subjectName}
                  {s.studentId != null &&
                    ` — خاص: ${s.studentName ?? `طالب #${s.studentId}`}`}
                </option>
              ))}
            </select>
            <input type="hidden" name="class_id" value={selClassId} />
            <input type="hidden" name="subject_id" value={selSubjectId} />
            <input type="hidden" name="student_id" value={selStudentId} />
          </div>

          {isPrivateSlot ? (
            <p className="rounded-lg border border-info/30 bg-info/10 p-3 text-sm text-info">
              واجب خاص: سيظهر لهذا الطالب فقط، ولن يراه باقي طلاب الفصل.
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="branch">الشعبة المستهدفة</Label>
              <select
                id="branch"
                name="branch"
                defaultValue=""
                className={SELECT_CLASS}
              >
                <option value="">الفصل كله (الشعبتين)</option>
                <option value="Arabic">شعبة العربي فقط</option>
                <option value="Languages">شعبة اللغات فقط</option>
              </select>
            </div>
          )}

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
            <Label>مرفقات (اختياري)</Label>
            <AttachmentDropzone
              queue={queue}
              disabled={busy}
              accept={[...TEACHER_ATTACHMENT_ALLOWED_MIMES, ".pdf", ".docx", ".txt", ".zip", ".mp4"].join(",")}
              maxFiles={ASSIGNMENT_ATTACHMENT_LIMITS.maxFiles}
              maxTotalBytes={ASSIGNMENT_ATTACHMENT_LIMITS.maxTotalBytes}
              baseCount={0}
              baseBytes={0}
            />
          </div>

          {uploadError && (
            <p className="text-sm text-destructive" aria-live="polite">
              {uploadError}
            </p>
          )}

          {result && (
            <p
              className={`text-sm ${result.ok ? "text-success" : "text-destructive"}`}
              aria-live="polite"
            >
              {result.message}
            </p>
          )}

          <Button type="submit" disabled={busy}>
            {busy ? "جاري الإنشاء…" : "إنشاء الواجب"}
          </Button>
        </fieldset>
        </form>
      </SectionCard>
    </>
  );
}
