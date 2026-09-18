"use client";

import {
  useActionState,
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionCard } from "@/components/shared/SectionCard";
import {
  ASSIGNMENT_ATTACHMENT_LIMITS,
  TEACHER_ATTACHMENT_ALLOWED_MIMES,
  validateAssignmentAttachmentBatch,
} from "@/lib/uploadLimits";
import { uploadTeacherAttachmentFile } from "@/lib/submissionUploader";
import { AttachmentDropzone, useAttachmentQueue } from "@/components/shared/AttachmentUploader";
import { FilePreview } from "../FilePreview";
import { updateAssignment, type ActionResult } from "../actions";

interface ExistingAttachment {
  driveId: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
}

// datetime-local needs "yyyy-MM-ddTHH:mm" in the viewer's OWN local time —
// building it from local getters (not toISOString, which is UTC) is what
// makes the pre-filled value actually match the stored instant on screen.
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditAssignmentForm({
  assignment,
  existingAttachments,
}: {
  assignment: {
    id: number;
    title: string;
    description: string | null;
    instructions: string | null;
    dueDateIso: string;
    maxGrade: number;
    allowFile: boolean;
    allowText: boolean;
  };
  existingAttachments: ExistingAttachment[];
}) {
  const [open, setOpen] = useState(false);
  const [result, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(updateAssignment, null);

  // Close the form once a save succeeds — same pattern as GradeForm.
  const [handledResult, setHandledResult] = useState(result);
  if (result !== handledResult) {
    setHandledResult(result);
    if (result?.ok) setOpen(false);
  }

  const [dueLocal, setDueLocal] = useState(() =>
    toLocalInputValue(assignment.dueDateIso),
  );
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const remainingExisting = existingAttachments.filter(
    (a) => !removedIds.has(a.driveId),
  );
  const remainingExistingBytes = remainingExisting.reduce(
    (sum, a) => sum + (a.sizeBytes ?? 0),
    0,
  );

  const queue = useAttachmentQueue({
    allowedMimes: TEACHER_ATTACHMENT_ALLOWED_MIMES,
    baseCount: remainingExisting.length,
    baseBytes: remainingExistingBytes,
    validateBatch: validateAssignmentAttachmentBatch,
  });
  const [, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const busy = isPending || queue.uploading;

  // a saved edit made the queued files real attachments
  useEffect(() => {
    if (result?.ok) queue.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Chunked upload first (a server action can't carry more than a few MB),
  // then the action just receives the uploaded files' ids.
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const formData = new FormData(e.currentTarget);
    setUploadError(null);
    let ids: string[];
    try {
      ids = await queue.uploadAll((file, onProgress) =>
        uploadTeacherAttachmentFile(file, assignment.id, onProgress),
      );
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "فشل رفع الملفات");
      return;
    }
    formData.set("new_file_ids", JSON.stringify(ids));
    startTransition(() => formAction(formData));
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" aria-hidden="true" />
        تعديل الواجب
      </Button>
    );
  }

  return (
    <SectionCard title="تعديل الواجب">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="assignment_id" value={assignment.id} />
        {[...removedIds].map((id) => (
          <input key={id} type="hidden" name="remove_attachment_ids" value={id} />
        ))}
        <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
          <div className="space-y-2">
            <Label htmlFor="edit-title">عنوان الواجب</Label>
            <Input id="edit-title" name="title" defaultValue={assignment.title} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-due_date">آخر موعد للتسليم</Label>
              <Input
                id="edit-due_date"
                type="datetime-local"
                dir="ltr"
                required
                value={dueLocal}
                onChange={(e) => setDueLocal(e.target.value)}
              />
              <input
                type="hidden"
                name="due_date"
                value={dueLocal ? new Date(dueLocal).toISOString() : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-max_grade">الدرجة العظمى</Label>
              <Input
                id="edit-max_grade"
                name="max_grade"
                type="number"
                min={1}
                max={100}
                defaultValue={assignment.maxGrade}
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">الوصف</Label>
            <Textarea
              id="edit-description"
              name="description"
              rows={2}
              defaultValue={assignment.description ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-instructions">التعليمات</Label>
            <Textarea
              id="edit-instructions"
              name="instructions"
              rows={2}
              defaultValue={assignment.instructions ?? ""}
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="allow_file" defaultChecked={assignment.allowFile} />
              يسمح برفع ملف
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="allow_text" defaultChecked={assignment.allowText} />
              يسمح بإجابة نصية
            </label>
          </div>

          <div className="space-y-2">
            <Label>المرفقات الحالية</Label>
            {remainingExisting.length === 0 ? (
              <p className="text-xs text-muted-foreground">لا توجد مرفقات</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {remainingExisting.map((a) => (
                  <div key={a.driveId} className="relative">
                    <FilePreview
                      file={{
                        url: `/api/files/${a.driveId}`,
                        fileName: a.fileName,
                        mimeType: a.mimeType,
                        sizeBytes: a.sizeBytes,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setRemovedIds((prev) => new Set(prev).add(a.driveId))
                      }
                      aria-label={`إزالة ${a.fileName}`}
                      className="absolute -top-1.5 -end-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {removedIds.size > 0 && (
              <button
                type="button"
                onClick={() => setRemovedIds(new Set())}
                className="text-xs text-primary underline underline-offset-2"
              >
                تراجع عن إزالة المرفقات ({removedIds.size})
              </button>
            )}
          </div>

          <div className="space-y-2">
            <Label>إضافة مرفقات جديدة</Label>
            <AttachmentDropzone
              queue={queue}
              disabled={busy}
              accept={[...TEACHER_ATTACHMENT_ALLOWED_MIMES, ".pdf", ".docx", ".txt", ".zip", ".mp4"].join(",")}
              maxFiles={ASSIGNMENT_ATTACHMENT_LIMITS.maxFiles}
              maxTotalBytes={ASSIGNMENT_ATTACHMENT_LIMITS.maxTotalBytes}
              baseCount={remainingExisting.length}
              baseBytes={remainingExistingBytes}
            />
          </div>

          {busy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {queue.uploading
                ? `جاري رفع «${queue.currentName ?? ""}» — لا تغلق الصفحة`
                : "جاري حفظ التعديلات…"}
            </p>
          )}

          {uploadError && (
            <p className="text-sm text-destructive" aria-live="polite">
              {uploadError}
            </p>
          )}

          {result && !result.ok && (
            <p className="text-sm text-destructive" aria-live="polite">
              {result.message}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "جاري الحفظ…" : "حفظ التعديلات"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
          </div>
        </fieldset>
      </form>
    </SectionCard>
  );
}
