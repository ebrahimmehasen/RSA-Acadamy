"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionCard } from "@/components/shared/SectionCard";
import {
  ASSIGNMENT_ATTACHMENT_LIMITS,
  formatFileSize,
  validateAssignmentAttachmentBatch,
} from "@/lib/uploadLimits";
import { FilePreview, type FileAttachment } from "../FilePreview";
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const newFilesBytes = selectedFiles.reduce((sum, f) => sum + f.size, 0);
  const newPreviewFiles: FileAttachment[] = selectedFiles.map((f, i) => ({
    url: previewUrls[i],
    fileName: f.name,
    mimeType: f.type || null,
    sizeBytes: f.size,
  }));

  const latestPreviewUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    latestPreviewUrlsRef.current = previewUrls;
  }, [previewUrls]);
  useEffect(() => {
    return () => {
      latestPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function syncInputFiles(list: File[]) {
    if (!fileInputRef.current) return;
    const dataTransfer = new DataTransfer();
    list.forEach((f) => dataTransfer.items.add(f));
    fileInputRef.current.files = dataTransfer.files;
  }

  function handleFilesPicked(picked: File[]) {
    if (picked.length === 0) return;
    const merged = [...selectedFiles, ...picked];
    const error = validateAssignmentAttachmentBatch(
      remainingExisting.length,
      remainingExistingBytes,
      merged,
    );
    if (error) {
      setFileError(error);
      syncInputFiles(selectedFiles);
      return;
    }
    setSelectedFiles(merged);
    setPreviewUrls((prev) => [...prev, ...picked.map((f) => URL.createObjectURL(f))]);
    setFileError(null);
    syncInputFiles(merged);
  }

  function clearNewFiles() {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="assignment_id" value={assignment.id} />
        {[...removedIds].map((id) => (
          <input key={id} type="hidden" name="remove_attachment_ids" value={id} />
        ))}
        <fieldset disabled={isPending} className="space-y-4 disabled:opacity-60">
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
            <Label htmlFor="edit-attachments">إضافة مرفقات جديدة</Label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-muted/20 px-6 py-6 text-center transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UploadCloud className="size-4" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold">اضغط هنا لاختيار الملفات</span>
              <span className="text-xs text-muted-foreground">
                حتى {ASSIGNMENT_ATTACHMENT_LIMITS.maxFiles} ملفات إجمالاً،{" "}
                {formatFileSize(ASSIGNMENT_ATTACHMENT_LIMITS.maxTotalBytes)} إجمالي
              </span>
            </button>
            <Input
              ref={fileInputRef}
              id="edit-attachments"
              name="attachments"
              type="file"
              multiple
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => handleFilesPicked(Array.from(e.target.files ?? []))}
            />
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {selectedFiles.length} ملف جديد · {formatFileSize(newFilesBytes)}
                </span>
                <button
                  type="button"
                  onClick={clearNewFiles}
                  className="text-destructive underline underline-offset-2"
                >
                  مسح الجديد
                </button>
              </div>
            )}
            {fileError && (
              <p className="text-sm text-destructive" aria-live="polite">
                {fileError}
              </p>
            )}
            {newPreviewFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {newPreviewFiles.map((f) => (
                  <FilePreview key={f.url} file={f} />
                ))}
              </div>
            )}
          </div>

          {result && !result.ok && (
            <p className="text-sm text-destructive" aria-live="polite">
              {result.message}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "جاري الحفظ…" : "حفظ التعديلات"}
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
