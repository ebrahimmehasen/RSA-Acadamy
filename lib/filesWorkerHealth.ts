import { fileUrl, workerBase } from "@/lib/signedFileUrl";

/**
 * Is the Cloudflare files Worker actually serving files? Asks it for a
 * signed link to a file that doesn't exist: a healthy Worker verifies the
 * signature, logs in to Drive and answers 404. Anything else means files
 * are broken or (when the env is missing) silently going through the
 * Vercel /api/files fallback.
 */
const PROBE_ID = "rsa-healthcheck";

export interface FilesWorkerHealth {
  /** null = healthy */
  issue: string | null;
  /** signed probe link, so the admin's browser can check it can reach the Worker too */
  probeUrl: string | null;
}

export async function checkFilesWorker(): Promise<FilesWorkerHealth> {
  if (!workerBase()) {
    return {
      issue:
        "عارض الملفات (Cloudflare Worker) غير مضبوط — FILES_WORKER_URL أو FILES_SIGNING_SECRET ناقص في Vercel، فالملفات تمر حاليًا عبر Vercel وتستهلك الحصة.",
      probeUrl: null,
    };
  }
  const probeUrl = fileUrl(PROBE_ID);
  try {
    // shortcut: result cached 5 min (also a failure), so an outage shows up within ~5 min
    const res = await fetch(probeUrl, {
      method: "HEAD",
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });
    if (res.status === 404) return { issue: null, probeUrl };
    if (res.status === 403) {
      return {
        issue:
          "عارض الملفات يرفض الروابط — قيمة FILES_SIGNING_SECRET في Vercel لا تطابق قيمتها في Cloudflare Worker. الصور والملفات لن تفتح.",
        probeUrl,
      };
    }
    return {
      issue: `عارض الملفات يعمل لكنه لا يستطيع الوصول إلى Google Drive (رمز ${res.status}) — راجع بيانات Google في إعدادات الـ Worker. الصور والملفات لن تفتح.`,
      probeUrl,
    };
  } catch {
    return {
      issue:
        "عارض الملفات (Cloudflare Worker) لا يستجيب — الصور والملفات والفيديوهات لن تفتح للمستخدمين. راجع حساب Cloudflare.",
      probeUrl,
    };
  }
}
