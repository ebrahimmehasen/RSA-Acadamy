"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  File as FileIcon,
  FileImage,
  FileText,
  FileVideo,
  Loader2,
  Maximize2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/uploadLimits";
import { cn } from "@/lib/utils";

export interface GalleryFile {
  /** authenticated /api/files/[id] URL — never a public storage URL */
  url: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
}

type Kind = "image" | "pdf" | "video" | "other";

function kindOf(mime: string | null): Kind {
  if (!mime) return "other";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  return "other";
}

function kindLabel(mime: string | null): string {
  if (!mime) return "ملف";
  if (mime.includes("wordprocessingml") || mime === "application/msword") return "مستند Word";
  if (mime === "text/plain") return "ملف نصي";
  if (mime.includes("zip")) return "أرشيف مضغوط";
  return mime;
}

function KindIcon({ kind, className }: { kind: Kind; className?: string }) {
  const Icon =
    kind === "image" ? FileImage : kind === "video" ? FileVideo : kind === "pdf" ? FileText : FileIcon;
  return <Icon className={className} aria-hidden="true" />;
}

function ImageBox({ file, className }: { file: GalleryFile; className: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden", className)}>
      {status === "loading" && (
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
      )}
      {status === "error" ? (
        <FileImage className="size-10 text-muted-foreground" aria-hidden="true" />
      ) : (
        <Image
          src={file.url}
          alt={file.fileName}
          fill
          unoptimized
          className={cn("object-contain", status !== "loaded" && "opacity-0")}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      )}
    </div>
  );
}

/**
 * Attachments shown right in the page: images and PDFs are previewed
 * inline (2–3 per row on wide screens), anything else as a file card.
 * Clicking opens a large lightbox that can step through every
 * attachment. Files stay behind the authenticated /api/files route.
 */
export function AttachmentGallery({ files }: { files: GalleryFile[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const count = files.length;
  const current = openIndex !== null ? files[openIndex] : null;

  function step(delta: number) {
    setOpenIndex((i) => (i === null ? i : (i + delta + count) % count));
  }

  useEffect(() => {
    if (openIndex === null || count < 2) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") step(1);
      if (e.key === "ArrowRight") step(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // step only closes over setOpenIndex/count
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIndex, count]);

  if (count === 0) return null;

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {files.map((file, i) => {
          const kind = kindOf(file.mimeType);
          return (
            <div key={file.url} className="flex flex-col overflow-hidden rounded-xl border bg-card">
              <button
                type="button"
                onClick={() => setOpenIndex(i)}
                aria-label={`عرض ${file.fileName} بحجم كبير`}
                className="group relative block h-56 w-full bg-muted/40 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-60"
              >
                {kind === "image" ? (
                  <ImageBox file={file} className="h-full w-full" />
                ) : kind === "pdf" ? (
                  <iframe
                    src={`${file.url}#toolbar=0&navpanes=0&view=FitH`}
                    title={file.fileName}
                    className="pointer-events-none h-full w-full border-0 bg-white"
                    tabIndex={-1}
                  />
                ) : kind === "video" ? (
                  <video
                    src={file.url}
                    preload="metadata"
                    muted
                    className="pointer-events-none h-full w-full object-contain"
                  />
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <KindIcon kind={kind} className="size-12" />
                    <span className="text-xs">{kindLabel(file.mimeType)}</span>
                  </span>
                )}
                <span className="absolute end-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/80 text-foreground opacity-80 shadow transition-opacity group-hover:opacity-100">
                  <Maximize2 className="size-3.5" aria-hidden="true" />
                </span>
              </button>
              <div className="flex items-center gap-2 border-t p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-start text-xs font-medium" dir="ltr">
                    {file.fileName}
                  </p>
                  {file.sizeBytes != null && (
                    <p className="text-[11px] text-muted-foreground">
                      {formatFileSize(file.sizeBytes)}
                    </p>
                  )}
                </div>
                <a
                  href={file.url}
                  download={file.fileName}
                  aria-label={`تحميل ${file.fileName}`}
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Download className="size-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={current !== null} onOpenChange={(o) => !o && setOpenIndex(null)}>
        <DialogContent className="sm:max-w-4xl">
          {current && (
            <>
              <DialogHeader>
                <DialogTitle dir="ltr" className="truncate pe-8 text-left">
                  {current.fileName}
                </DialogTitle>
              </DialogHeader>
              <div className="overflow-hidden rounded-lg border bg-muted/30">
                {kindOf(current.mimeType) === "image" ? (
                  <ImageBox key={current.url} file={current} className="h-[70vh] w-full" />
                ) : kindOf(current.mimeType) === "pdf" ? (
                  <iframe
                    key={current.url}
                    src={current.url}
                    title={current.fileName}
                    className="h-[70vh] w-full border-0 bg-white"
                  />
                ) : kindOf(current.mimeType) === "video" ? (
                  <video
                    key={current.url}
                    src={current.url}
                    controls
                    className="max-h-[70vh] w-full"
                  />
                ) : (
                  <div className="flex h-60 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                    <KindIcon kind="other" className="size-12" />
                    <p className="text-sm">{kindLabel(current.mimeType)}</p>
                    <p className="text-xs">لا يمكن عرض هذا النوع داخل الصفحة — حمّله لفتحه</p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {count > 1 && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => step(-1)}
                        aria-label="السابق"
                      >
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </Button>
                      <span className="min-w-12 text-center text-xs text-muted-foreground" dir="ltr">
                        {(openIndex ?? 0) + 1} / {count}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => step(1)}
                        aria-label="التالي"
                      >
                        <ChevronLeft className="size-4" aria-hidden="true" />
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <a
                    href={current.url}
                    download={current.fileName}
                    className="inline-flex items-center gap-1.5 text-primary underline underline-offset-4"
                  >
                    <Download className="size-4" aria-hidden="true" />
                    تحميل
                  </a>
                  <a
                    href={current.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-muted-foreground underline underline-offset-4"
                  >
                    <ExternalLink className="size-4" aria-hidden="true" />
                    فتح في تبويب
                  </a>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
