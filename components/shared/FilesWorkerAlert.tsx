"use client";

import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";

/**
 * Admin-only banner: shows the server-side Worker check result, and also
 * checks the Worker is reachable from THIS device (some networks can't
 * reach workers.dev even when it's up for everyone else).
 */
export function FilesWorkerAlert({
  issue,
  probeUrl,
}: {
  issue: string | null;
  probeUrl: string | null;
}) {
  const [unreachableHere, setUnreachableHere] = useState(false);

  useEffect(() => {
    if (issue || !probeUrl) return;
    // no-cors: we only learn "reachable or not", which is all we need
    fetch(probeUrl, { method: "HEAD", mode: "no-cors", signal: AbortSignal.timeout(8000) })
      .then(() => setUnreachableHere(false))
      .catch(() => setUnreachableHere(true));
  }, [issue, probeUrl]);

  const message =
    issue ??
    (unreachableHere
      ? "عارض الملفات (Cloudflare Worker) لا يصل إليه هذا الجهاز/الشبكة — قد لا تظهر الصور والملفات هنا. جرّب شبكة أخرى أو DNS ‏1.1.1.1، وتأكد أن المستخدمين لا يواجهون نفس المشكلة."
      : null);
  if (!message) return null;

  return (
    <div role="alert" className="border-b bg-destructive/10 px-4 py-2.5 text-destructive md:px-6">
      <div className="flex items-start gap-2 text-sm">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1">{message}</p>
      </div>
    </div>
  );
}
