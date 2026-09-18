"use client";

import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import {
  Camera,
  CheckCircle2,
  File as FileIcon,
  FileText,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  SUBMISSION_ALLOWED_MIMES,
  SUBMISSION_LIMITS,
  formatFileSize,
  validateSubmissionBatch,
} from "@/lib/uploadLimits";
import { uploadSubmissionFile, type UploadedFileInfo } from "@/lib/submissionUploader";
import { cn } from "@/lib/utils";
import { submitAssignment } from "./actions";

export interface ExistingSubmissionFile {
  id: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
}

interface PendingItem {
  key: string;
  file: File;
  previewUrl: string | null;
  status: "ready" | "uploading" | "done" | "error";
  uploadedBytes: number;
  uploaded?: UploadedFileInfo;
  error?: string;
}

const ACCEPT = [
  ...SUBMISSION_ALLOWED_MIMES,
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".pdf",
  ".docx",
  ".txt",
  ".zip",
].join(",");

let keyCounter = 0;

export function SubmitForm({
  assignmentId,
  allowFile,
  allowText,
  mode = "create",
  defaultText = "",
  existingFiles = [],
}: {
  assignmentId: number;
  allowFile: boolean;
  allowText: boolean;
  /** "update" edits the student's existing (not yet graded) submission */
  mode?: "create" | "update";
  defaultText?: string;
  existingFiles?: ExistingSubmissionFile[];
}) {
  const editing = mode === "update";
  const [items, setItems] = useState<PendingItem[]>([]);
  const [keptIds, setKeptIds] = useState<string[]>(existingFiles.map((f) => f.id));
  const [text, setText] = useState(defaultText);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const pickRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const kept = existingFiles.filter((f) => keptIds.includes(f.id));
  const keptBytes = kept.reduce((s, f) => s + (f.sizeBytes ?? 0), 0);
  const newBytes = items.reduce((s, i) => s + i.file.size, 0);
  const usedBytes = keptBytes + newBytes;
  const usedPct = Math.min(100, (usedBytes / SUBMISSION_LIMITS.maxTotalBytes) * 100);

  // free blob URLs on unmount (latest list read via a ref, only in effects)
  const latestItems = useRef<PendingItem[]>([]);
  useEffect(() => {
    latestItems.current = items;
  }, [items]);
  useEffect(() => {
    return () => {
      latestItems.current.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl));
    };
  }, []);

  // don't let the tab be closed silently in the middle of an upload
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  function patch(key: string, changes: Partial<PendingItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...changes } : i)));
  }

  function addFiles(picked: File[]) {
    if (picked.length === 0) return;
    setResult(null);
    const fresh = picked.filter(
      (f) =>
        !items.some(
          (i) =>
            i.file.name === f.name &&
            i.file.size === f.size &&
            i.file.lastModified === f.lastModified,
        ),
    );
    for (const f of fresh) {
      if (f.size <= 0) return setFileError(`${f.name}: الملف فارغ`);
      if (!(SUBMISSION_ALLOWED_MIMES as readonly string[]).includes(f.type)) {
        return setFileError(`${f.name}: نوع الملف غير مسموح به (صور، PDF، Word، نص، ZIP)`);
      }
    }
    const error = validateSubmissionBatch(
      kept.length + items.length,
      usedBytes,
      fresh,
    );
    if (error) return setFileError(error);
    setFileError(null);
    setItems((prev) => [
      ...prev,
      ...fresh.map((file) => ({
        key: `f${++keyCounter}`,
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        status: "ready" as const,
        uploadedBytes: 0,
      })),
    ]);
  }

  function removeItem(key: string) {
    setItems((prev) => {
      const target = prev.find((i) => i.key === key);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.key !== key);
    });
    setFileError(null);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (!busy) addFiles(Array.from(e.dataTransfer.files));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setResult(null);
    if (items.length + kept.length === 0 && !text.trim()) {
      setResult({ ok: false, message: "ارفع ملفًا أو اكتب إجابة نصية" });
      return;
    }
    setBusy(true);
    try {
      const uploaded = new Map<string, UploadedFileInfo>();
      for (const item of items) {
        if (item.uploaded) {
          uploaded.set(item.key, item.uploaded);
          continue;
        }
        patch(item.key, { status: "uploading", uploadedBytes: 0, error: undefined });
        try {
          const info = await uploadSubmissionFile(item.file, assignmentId, (b) =>
            patch(item.key, { uploadedBytes: b }),
          );
          uploaded.set(item.key, info);
          patch(item.key, { status: "done", uploaded: info, uploadedBytes: item.file.size });
        } catch (error) {
          const message = error instanceof Error ? error.message : "فشل رفع الملف";
          patch(item.key, { status: "error", error: message });
          setResult({
            ok: false,
            message: `تعذّر رفع «${item.file.name}» — ${message}. الملفات التي اكتمل رفعها لن تُرفع مرة أخرى.`,
          });
          return;
        }
      }

      const formData = new FormData();
      formData.set("assignment_id", String(assignmentId));
      formData.set("intent", mode);
      formData.set("text_answer", text);
      formData.set("new_file_ids", JSON.stringify([...uploaded.values()].map((u) => u.id)));
      if (editing) formData.set("keep_file_ids", JSON.stringify(keptIds));

      const res = await submitAssignment(null, formData);
      setResult(res);
      if (res.ok) {
        items.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl));
        setItems([]);
      }
    } catch (error) {
      setResult({
        ok: false,
        message: error instanceof Error ? error.message : "حدث خطأ",
      });
    } finally {
      setBusy(false);
    }
  }

  const uploadingNow = items.find((i) => i.status === "uploading");

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <fieldset disabled={busy} className="space-y-4 disabled:opacity-90">
        {allowFile && (
          <div className="space-y-3">
            <Label>{editing ? "ملفات الحل" : "ملفات الإجابة"}</Label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                "rounded-2xl border-2 border-dashed bg-muted/20 p-4 transition-colors sm:p-6",
                dragOver ? "border-primary bg-primary/5" : "border-input",
              )}
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UploadCloud className="size-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-heading text-sm font-semibold">
                    اسحب الملفات هنا أو اختر طريقة الرفع
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    صور، PDF، Word، نص، ZIP — حتى{" "}
                    {formatFileSize(SUBMISSION_LIMITS.maxTotalBytes)} للواجب الواحد وحتى{" "}
                    {SUBMISSION_LIMITS.maxFiles} ملفًا
                  </p>
                </div>
                <div className="grid w-full max-w-md gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 gap-2"
                    onClick={() => pickRef.current?.click()}
                  >
                    <FileText className="size-4" aria-hidden="true" />
                    اختيار ملفات
                  </Button>
                  <Button
                    type="button"
                    className="h-11 gap-2"
                    onClick={() => cameraRef.current?.click()}
                  >
                    <Camera className="size-4" aria-hidden="true" />
                    تصوير بالكاميرا
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  يمكنك تصوير أكثر من صورة — كل مرة تُضاف للقائمة
                </p>
              </div>
              <input
                ref={pickRef}
                type="file"
                multiple
                accept={ACCEPT}
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  addFiles(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  addFiles(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
            </div>

            {fileError && (
              <p className="text-sm text-destructive" aria-live="polite">
                {fileError}
              </p>
            )}

            {(kept.length > 0 || items.length > 0) && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {kept.length + items.length} ملف · {formatFileSize(usedBytes)}
                    </span>
                    <span dir="ltr">
                      {formatFileSize(usedBytes)} / {formatFileSize(SUBMISSION_LIMITS.maxTotalBytes)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: `${Math.max(usedPct, usedBytes > 0 ? 1 : 0)}%` }}
                    />
                  </div>
                </div>

                <ul className="grid gap-2 sm:grid-cols-2">
                  {kept.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center gap-3 rounded-xl border bg-card p-2"
                    >
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <FileIcon className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-start text-sm font-medium" dir="ltr">
                          {f.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          مرفوع سابقًا
                          {f.sizeBytes != null && ` · ${formatFileSize(f.sizeBytes)}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setKeptIds((ids) => ids.filter((id) => id !== f.id))}
                        aria-label={`إزالة ${f.name}`}
                        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}

                  {items.map((i) => {
                    const pct =
                      i.status === "done"
                        ? 100
                        : Math.round((i.uploadedBytes / i.file.size) * 100);
                    return (
                      <li
                        key={i.key}
                        className="flex items-center gap-3 rounded-xl border bg-card p-2"
                      >
                        {i.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={i.previewUrl}
                            alt=""
                            className="size-12 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <FileIcon className="size-5" aria-hidden="true" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="truncate text-start text-sm font-medium" dir="ltr">
                            {i.file.name}
                          </p>
                          {i.status === "ready" && (
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(i.file.size)}
                            </p>
                          )}
                          {(i.status === "uploading" || i.status === "done") && (
                            <div className="space-y-0.5">
                              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-[width]",
                                    i.status === "done" ? "bg-success" : "bg-primary",
                                  )}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {i.status === "done" ? "تم الرفع" : `${pct}%`} ·{" "}
                                {formatFileSize(i.file.size)}
                              </p>
                            </div>
                          )}
                          {i.status === "error" && (
                            <p className="text-xs text-destructive">{i.error}</p>
                          )}
                        </div>
                        {i.status === "done" ? (
                          <CheckCircle2
                            className="size-5 shrink-0 text-success"
                            aria-hidden="true"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => removeItem(i.key)}
                            aria-label={`إزالة ${i.file.name}`}
                            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="size-4" aria-hidden="true" />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        {allowText && (
          <div className="space-y-2">
            <Label htmlFor="text_answer">إجابة نصية</Label>
            <Textarea
              id="text_answer"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="اكتب إجابتك هنا…"
            />
          </div>
        )}
      </fieldset>

      {busy && (
        <p
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {uploadingNow
            ? `جاري رفع «${uploadingNow.file.name}» — لا تغلق الصفحة`
            : "جاري حفظ الحل…"}
        </p>
      )}

      {result && (
        <p
          aria-live="polite"
          className={`text-sm ${result.ok ? "text-success" : "text-destructive"}`}
        >
          {result.message}
        </p>
      )}

      <Button type="submit" disabled={busy} className="h-11 w-full sm:w-auto">
        {busy
          ? editing
            ? "جاري الحفظ…"
            : "جاري التسليم…"
          : editing
            ? "حفظ التعديل"
            : "تسليم الواجب"}
      </Button>
    </form>
  );
}
