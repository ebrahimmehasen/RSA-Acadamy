"use client";

import { useState } from "react";
import Image from "next/image";
import {
  FileImage,
  FileVideo,
  FileText,
  File as FileIcon,
  Download,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFileSize } from "@/lib/uploadLimits";
import { cn } from "@/lib/utils";

export interface FileAttachment {
  /** Google Drive file id — used to build the authenticated /api/files/[id] URL */
  id: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
}

type FileCategory = "image" | "pdf" | "video" | "other";

function categorize(mimeType: string | null): FileCategory {
  if (!mimeType) return "other";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("video/")) return "video";
  return "other";
}

const WORD_MIMES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function fileKindLabel(mimeType: string | null): string {
  if (!mimeType) return "ملف";
  if (WORD_MIMES.has(mimeType)) return "مستند Word";
  if (mimeType === "text/plain") return "ملف نصي";
  if (mimeType.includes("zip")) return "أرشيف مضغوط";
  if (mimeType === "application/pdf") return "PDF";
  return mimeType;
}

/**
 * One attachment shown as a real preview instead of a plain link —
 * image/PDF/video render inline (thumbnail here, full-size in the
 * dialog); anything the browser can't preview natively (Word, zip,
 * plain text, …) gets a clear file card with an "فتح الملف" fallback
 * that still uses the existing authenticated /api/files/[id] route.
 */
export function FilePreview({ file }: { file: FileAttachment }) {
  const [open, setOpen] = useState(false);
  const [imageStatus, setImageStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );
  const url = `/api/files/${file.id}`;
  const category = categorize(file.mimeType);
  const previewable = category === "image" || category === "pdf" || category === "video";

  const Icon =
    category === "image" ? FileImage : category === "video" ? FileVideo : FileText;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-40 flex-col overflow-hidden rounded-lg border bg-card text-start outline-none transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="relative flex h-24 w-full items-center justify-center overflow-hidden bg-muted/50">
          {category === "image" ? (
            <>
              {imageStatus === "loading" && (
                <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
              )}
              {imageStatus !== "error" && (
                <Image
                  src={url}
                  alt={file.fileName}
                  fill
                  unoptimized
                  className={cn(
                    "object-cover",
                    imageStatus !== "loaded" && "hidden",
                  )}
                  onLoad={() => setImageStatus("loaded")}
                  onError={() => setImageStatus("error")}
                />
              )}
              {imageStatus === "error" && (
                <FileImage className="size-8 text-muted-foreground" aria-hidden="true" />
              )}
            </>
          ) : category === "pdf" ? (
            <iframe
              src={`${url}#toolbar=0&view=FitH`}
              title={file.fileName}
              className="h-full w-full scale-105 border-0"
              tabIndex={-1}
              aria-hidden="true"
            />
          ) : category === "video" ? (
            <video src={url} className="h-full w-full object-cover" preload="metadata" muted />
          ) : (
            <Icon className="size-8 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        <div className="space-y-0.5 p-2">
          <p className="truncate text-xs font-medium">{file.fileName}</p>
          <p className="text-[11px] text-muted-foreground">
            {file.sizeBytes != null ? formatFileSize(file.sizeBytes) : fileKindLabel(file.mimeType)}
          </p>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{file.fileName}</DialogTitle>
          </DialogHeader>
          {previewable ? (
            <div className="overflow-hidden rounded-lg border bg-muted/30">
              {category === "image" && (
                <div className="relative h-[75vh] w-full">
                  <Image
                    src={url}
                    alt={file.fileName}
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>
              )}
              {category === "pdf" && (
                <iframe src={url} title={file.fileName} className="h-[75vh] w-full border-0" />
              )}
              {category === "video" && (
                <video src={url} controls className="max-h-[75vh] w-full" />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
              <FileIcon className="size-10 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="font-medium">{fileKindLabel(file.mimeType)}</p>
                <p className="text-sm text-muted-foreground">
                  لا يمكن عرض هذا النوع من الملفات مباشرة داخل الصفحة
                </p>
              </div>
            </div>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 self-start text-sm text-primary underline underline-offset-4"
          >
            <Download className="size-4" aria-hidden="true" />
            فتح الملف في تبويب جديد
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** A row of attachment previews. */
export function FilePreviewGrid({ files }: { files: FileAttachment[] }) {
  if (files.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((f) => (
        <FilePreview key={f.id} file={f} />
      ))}
    </div>
  );
}
