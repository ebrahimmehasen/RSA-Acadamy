"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Camera, CheckCircle2, File as FileIcon, FileText, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/uploadLimits";
import type { UploadedFileInfo } from "@/lib/submissionUploader";
import { cn } from "@/lib/utils";

export interface QueueItem {
  key: string;
  file: File;
  previewUrl: string | null;
  status: "ready" | "uploading" | "done" | "error";
  uploadedBytes: number;
  uploaded?: UploadedFileInfo;
  error?: string;
}

type UploadFn = (file: File, onProgress: (uploadedBytes: number) => void) => Promise<UploadedFileInfo>;

let keyCounter = 0;

/**
 * Files a user has picked (file picker, drag & drop or camera) waiting to
 * be uploaded in chunks when the form is submitted. Keeps every pick —
 * unlike a native <input multiple>, which forgets the earlier batch each
 * time it reopens.
 */
export function useAttachmentQueue(cfg: {
  allowedMimes: readonly string[];
  /** files/bytes already attached that count toward the limits (e.g. existing attachments being edited) */
  baseCount: number;
  baseBytes: number;
  validateBatch: (count: number, bytes: number, newFiles: { size: number }[]) => string | null;
}) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const latest = useRef<QueueItem[]>([]);
  useEffect(() => {
    latest.current = items;
  }, [items]);
  useEffect(() => {
    return () => {
      latest.current.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl));
    };
  }, []);

  const queuedBytes = items.reduce((s, i) => s + i.file.size, 0);

  function patch(key: string, changes: Partial<QueueItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...changes } : i)));
  }

  function addFiles(picked: File[]) {
    if (picked.length === 0) return;
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
      if (f.size <= 0) return setError(`${f.name}: الملف فارغ`);
      if (!cfg.allowedMimes.includes(f.type)) {
        return setError(`${f.name}: نوع الملف غير مسموح به`);
      }
    }
    const limitError = cfg.validateBatch(
      cfg.baseCount + items.length,
      cfg.baseBytes + queuedBytes,
      fresh,
    );
    if (limitError) return setError(limitError);
    setError(null);
    setItems((prev) => [
      ...prev,
      ...fresh.map((file) => ({
        key: `q${++keyCounter}`,
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
    setError(null);
  }

  function clear() {
    setItems((prev) => {
      prev.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl));
      return [];
    });
    setError(null);
  }

  /**
   * Uploads every not-yet-uploaded file one after another and returns all
   * their Drive ids (in list order). Files that finished on an earlier
   * attempt aren't sent again. Throws with a readable message on failure.
   */
  async function uploadAll(upload: UploadFn): Promise<string[]> {
    setUploading(true);
    try {
      const ids: string[] = [];
      for (const item of latest.current) {
        if (item.uploaded) {
          ids.push(item.uploaded.id);
          continue;
        }
        patch(item.key, { status: "uploading", uploadedBytes: 0, error: undefined });
        try {
          const info = await upload(item.file, (b) => patch(item.key, { uploadedBytes: b }));
          patch(item.key, { status: "done", uploaded: info, uploadedBytes: item.file.size });
          ids.push(info.id);
        } catch (e) {
          const message = e instanceof Error ? e.message : "فشل رفع الملف";
          patch(item.key, { status: "error", error: message });
          throw new Error(`تعذّر رفع «${item.file.name}» — ${message}`);
        }
      }
      return ids;
    } finally {
      setUploading(false);
    }
  }

  const current = items.find((i) => i.status === "uploading");
  const doneCount = items.filter((i) => i.status === "done").length;

  return {
    items,
    error,
    uploading,
    queuedBytes,
    addFiles,
    removeItem,
    clear,
    uploadAll,
    currentName: current?.file.name ?? null,
    doneCount,
  };
}

export type AttachmentQueue = ReturnType<typeof useAttachmentQueue>;

export function AttachmentDropzone({
  queue,
  accept,
  disabled,
  maxFiles,
  maxTotalBytes,
  baseCount,
  baseBytes,
  hint,
}: {
  queue: AttachmentQueue;
  accept: string;
  disabled?: boolean;
  maxFiles: number;
  maxTotalBytes: number;
  baseCount: number;
  baseBytes: number;
  hint?: string;
}) {
  const pickRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { items } = queue;
  const usedBytes = baseBytes + queue.queuedBytes;
  const usedCount = baseCount + items.length;
  const pct = Math.min(100, (usedBytes / maxTotalBytes) * 100);

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (!disabled) queue.addFiles(Array.from(e.dataTransfer.files));
  }

  return (
    <div className="space-y-3">
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
              {hint ??
                `حتى ${maxFiles} ملفات، ${formatFileSize(maxTotalBytes)} إجمالي — يمكنك الإضافة على أكثر من دفعة`}
            </p>
          </div>
          <div className="grid w-full max-w-md gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="h-11 gap-2"
              onClick={() => pickRef.current?.click()}
            >
              <FileText className="size-4" aria-hidden="true" />
              اختيار ملفات
            </Button>
            <Button
              type="button"
              disabled={disabled}
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
          accept={accept}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            queue.addFiles(Array.from(e.target.files ?? []));
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
            queue.addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {queue.error && (
        <p className="text-sm text-destructive" aria-live="polite">
          {queue.error}
        </p>
      )}

      {usedCount > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {usedCount} من {maxFiles} ملفات
            </span>
            <span dir="ltr">
              {formatFileSize(usedBytes)} / {formatFileSize(maxTotalBytes)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${Math.max(pct, usedBytes > 0 ? 1 : 0)}%` }}
            />
          </div>
        </div>
      )}

      {items.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map((i) => {
            const p =
              i.status === "done" ? 100 : Math.round((i.uploadedBytes / i.file.size) * 100);
            return (
              <li key={i.key} className="flex items-center gap-3 rounded-xl border bg-card p-2">
                {i.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.previewUrl} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
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
                    <p className="text-xs text-muted-foreground">{formatFileSize(i.file.size)}</p>
                  )}
                  {(i.status === "uploading" || i.status === "done") && (
                    <div className="space-y-0.5">
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-[width]",
                            i.status === "done" ? "bg-success" : "bg-primary",
                          )}
                          style={{ width: `${p}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {i.status === "done" ? "تم الرفع" : `${p}%`} · {formatFileSize(i.file.size)}
                      </p>
                    </div>
                  )}
                  {i.status === "error" && <p className="text-xs text-destructive">{i.error}</p>}
                </div>
                {i.status === "done" ? (
                  <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => queue.removeItem(i.key)}
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
      )}
    </div>
  );
}
