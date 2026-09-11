"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionCard } from "@/components/shared/SectionCard";
import { SELECT_CLASS } from "@/lib/ui";
import {
  ASSIGNMENT_ATTACHMENT_LIMITS,
  formatFileSize,
  validateAssignmentAttachmentBatch,
} from "@/lib/uploadLimits";
import { FilePreviewGrid, type FileAttachment } from "./FilePreview";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  // Local (not-yet-uploaded) preview URLs — kept in lockstep with
  // selectedFiles (same length, same order) so no ref access is needed
  // during render to look one up.
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const totalBytes = selectedFiles.reduce((sum, f) => sum + f.size, 0);
  const previewFiles: FileAttachment[] = selectedFiles.map((f, i) => ({
    url: previewUrls[i],
    fileName: f.name,
    mimeType: f.type || null,
    sizeBytes: f.size,
  }));

  // Revoke every blob URL still outstanding when the form unmounts.
  // Tracked via a ref (updated from an effect, read only in an effect
  // cleanup) rather than closing over `previewUrls` directly, since that
  // would freeze the empty initial array in the cleanup's closure.
  const latestPreviewUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    latestPreviewUrlsRef.current = previewUrls;
  }, [previewUrls]);
  useEffect(() => {
    return () => {
      latestPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // A successful create() means these files are now the assignment's
  // saved attachments — clear the picker so it's ready for a next one.
  useEffect(() => {
    if (result?.ok) clearFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Native <input type=file multiple> REPLACES its selection every time
  // the picker reopens, so re-syncing input.files to the merged list
  // (via DataTransfer) is what actually lets the teacher add files "on
  // top of" what's already picked across several picker opens, instead
  // of losing the earlier batch.
  function syncInputFiles(list: File[]) {
    if (!fileInputRef.current) return;
    const dataTransfer = new DataTransfer();
    list.forEach((f) => dataTransfer.items.add(f));
    fileInputRef.current.files = dataTransfer.files;
  }

  function handleFilesPicked(picked: File[]) {
    if (picked.length === 0) return;
    const merged = [...selectedFiles, ...picked];
    const error = validateAssignmentAttachmentBatch(0, 0, merged);
    if (error) {
      // Reject only this new pick — keep whatever was already validly
      // selected (re-sync the input so the rejected pick isn't left in it).
      setFileError(error);
      syncInputFiles(selectedFiles);
      return;
    }
    setSelectedFiles(merged);
    setPreviewUrls((prev) => [...prev, ...picked.map((f) => URL.createObjectURL(f))]);
    setFileError(null);
    syncInputFiles(merged);
  }

  function clearFiles() {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <>
      {isPending && (
        <div
          role="status"
          aria-live="assertive"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm"
        >
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
          <p className="font-heading text-sm font-semibold">جاري إنشاء الواجب…</p>
          <p className="text-xs text-muted-foreground">
            يرجى الانتظار وعدم إغلاق الصفحة أو تحديثها
          </p>
        </div>
      )}
      <SectionCard title="إنشاء واجب جديد">
        <form action={formAction} className="space-y-4">
        <fieldset disabled={isPending} className="space-y-4 disabled:opacity-60">
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
            <Label htmlFor="attachments">مرفقات (اختياري)</Label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-muted/20 px-6 py-8 text-center transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UploadCloud className="size-5" aria-hidden="true" />
              </span>
              <span className="font-heading text-sm font-semibold">
                اضغط هنا لاختيار الملفات
              </span>
              <span className="text-xs text-muted-foreground">
                حتى {ASSIGNMENT_ATTACHMENT_LIMITS.maxFiles} ملفات،{" "}
                {formatFileSize(ASSIGNMENT_ATTACHMENT_LIMITS.maxTotalBytes)} إجمالي — يمكنك
                الإضافة على أكثر من دفعة
              </span>
            </button>
            <Input
              ref={fileInputRef}
              id="attachments"
              name="attachments"
              type="file"
              multiple
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                handleFilesPicked(picked);
              }}
            />
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {selectedFiles.length} ملف · {formatFileSize(totalBytes)} من
                  أصل {formatFileSize(ASSIGNMENT_ATTACHMENT_LIMITS.maxTotalBytes)}
                </span>
                <button
                  type="button"
                  onClick={clearFiles}
                  className="text-destructive underline underline-offset-2"
                >
                  مسح الكل
                </button>
              </div>
            )}
            {fileError && (
              <p className="text-sm text-destructive" aria-live="polite">
                {fileError}
              </p>
            )}
            <FilePreviewGrid files={previewFiles} />
          </div>

          {result && (
            <p
              className={`text-sm ${result.ok ? "text-success" : "text-destructive"}`}
              aria-live="polite"
            >
              {result.message}
            </p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "جاري الإنشاء…" : "إنشاء الواجب"}
          </Button>
        </fieldset>
        </form>
      </SectionCard>
    </>
  );
}
