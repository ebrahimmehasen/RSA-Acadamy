"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A generated secret (e.g. a freshly reset password) shown in its own
 * box. Clicking or pressing Enter/Space copies it to the clipboard and
 * flashes a "تم النسخ" confirmation.
 */
export function CopyableSecret({
  value,
  label = "كلمة السر الجديدة",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable (insecure context) — the value is still visible
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`${label}: ${value} — اضغط للنسخ`}
      className={cn(
        "group flex min-w-0 items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-start outline-none transition-colors hover:bg-green-100 focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-green-800 dark:bg-green-950 dark:hover:bg-green-900",
        className,
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span dir="ltr" className="block truncate font-mono text-sm font-bold">
          {value}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
        {copied ? (
          <>
            <Check className="size-4" aria-hidden="true" /> تم النسخ
          </>
        ) : (
          <>
            <Copy className="size-4" aria-hidden="true" /> نسخ
          </>
        )}
      </span>
    </button>
  );
}
