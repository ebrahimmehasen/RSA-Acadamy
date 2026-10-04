import { createAdminClient } from "@/lib/supabase/admin";
import {
  ASSIGNMENT_ATTACHMENT_LIMITS,
  SUBMISSION_ALLOWED_MIMES,
  SUBMISSION_LIMITS,
  TEACHER_ATTACHMENT_ALLOWED_MIMES,
} from "@/lib/uploadLimits";

// Size/type rules + the file_storage registry. There is deliberately NO
// server-side "upload this buffer" helper: file bytes must never pass
// through a Vercel function — see CLAUDE.md ("Files") and lib/uploads/.

/** Limits per upload kind (from TECHNICAL_DECISIONS.md #5, #11, #18, #30). */
export const UPLOAD_RULES = {
  profile: {
    maxBytes: 5 * 1024 * 1024,
    mimes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  },
  assignment: {
    // student answers: per-file cap == the whole-answer cap (5GB); the
    // aggregate limit is enforced separately (see SUBMISSION_LIMITS)
    maxBytes: SUBMISSION_LIMITS.maxTotalBytes,
    mimes: SUBMISSION_ALLOWED_MIMES,
  },
  teacher_attachment: {
    // per-file cap == the whole-assignment cap (lib/uploadLimits.ts) — a
    // single file can't exceed it anyway once the aggregate check runs,
    // this just avoids a redundant lower ceiling.
    maxBytes: ASSIGNMENT_ATTACHMENT_LIMITS.maxTotalBytes,
    mimes: TEACHER_ATTACHMENT_ALLOWED_MIMES,
  },
  session: {
    maxBytes: 1024 * 1024 * 1024, // 1GB
    mimes: ["video/mp4", "video/webm"],
  },
  quiz: {
    maxBytes: 25 * 1024 * 1024,
    mimes: [
      "image/jpeg", "image/png", "image/gif",
      "application/pdf", "application/zip", "application/x-zip-compressed",
    ],
  },
  announcement: {
    maxBytes: 100 * 1024 * 1024,
    mimes: [
      "image/jpeg", "image/png", "image/gif",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "video/mp4",
      "application/zip", "application/x-zip-compressed",
    ],
  },
  teacher_cv: {
    maxBytes: 10 * 1024 * 1024,
    mimes: ["application/pdf"],
  },
} as const;

export type UploadKind = keyof typeof UPLOAD_RULES;

export function validateUpload(
  kind: UploadKind,
  mimeType: string,
  sizeBytes: number,
): string | null {
  const rule = UPLOAD_RULES[kind];
  if (sizeBytes > rule.maxBytes) {
    return `الملف أكبر من الحد الأقصى المسموح به (${Math.round(rule.maxBytes / 1024 / 1024)}MB)`;
  }
  if (!(rule.mimes as readonly string[]).includes(mimeType)) {
    return "نوع الملف غير مسموح به";
  }
  return null;
}

export async function registerFile(options: {
  driveFileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  entityType: UploadKind | "other";
  entityId: string;
  uploadedBy: number | null;
}) {
  const supabase = createAdminClient();
  await supabase.from("file_storage").insert({
    drive_file_id: options.driveFileId,
    file_name: options.fileName,
    mime_type: options.mimeType,
    file_size: options.sizeBytes,
    entity_type: options.entityType,
    entity_id: options.entityId,
    uploaded_by: options.uploadedBy,
  });
}
