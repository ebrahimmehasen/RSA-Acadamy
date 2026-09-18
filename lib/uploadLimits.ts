/**
 * Aggregate (whole-assignment) attachment limits — separate from the
 * per-file mime/size rules in lib/googleDrive/upload.ts. Kept in its
 * own file (no drive/supabase imports) so both server actions and
 * client components can import it safely.
 */
export const ASSIGNMENT_ATTACHMENT_LIMITS = {
  maxFiles: 10,
  maxTotalBytes: 5 * 1024 * 1024 * 1024, // 5 GB
} as const;

/**
 * A student's answer to one assignment: several files (photos of the
 * notebook, a PDF, …) up to 5GB in total. Uploaded in chunks straight
 * through /api/uploads/submission, because a single server-action
 * request can't carry more than a few MB on the host.
 */
export const SUBMISSION_LIMITS = {
  maxFiles: 20,
  maxTotalBytes: 5 * 1024 * 1024 * 1024, // 5 GB per assignment
  /** must be a multiple of 256 KiB (Drive resumable protocol) and < 4.5 MB */
  chunkBytes: 4 * 1024 * 1024,
} as const;

/** Types a student may attach to an answer (shared by client + server). */
export const SUBMISSION_ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
] as const;

/** Types a teacher may attach to an assignment (shared by client + server). */
export const TEACHER_ATTACHMENT_ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "video/mp4",
] as const;

/** Chunk size for teacher uploads — same protocol/limits as SUBMISSION_LIMITS. */
export const TEACHER_UPLOAD_CHUNK_BYTES = 4 * 1024 * 1024;

/** Bytes → a human-readable "X.XX GB" / "X MB" / "X KB" string. */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} بايت`;
}

/** Same shape as validateAssignmentAttachmentBatch, for a student's answer. */
export function validateSubmissionBatch(
  existingCount: number,
  existingTotalBytes: number,
  newFiles: { size: number }[],
): string | null {
  if (existingCount + newFiles.length > SUBMISSION_LIMITS.maxFiles) {
    return `الحد الأقصى لعدد ملفات الحل هو ${SUBMISSION_LIMITS.maxFiles} ملفًا`;
  }
  const total = existingTotalBytes + newFiles.reduce((s, f) => s + f.size, 0);
  if (total > SUBMISSION_LIMITS.maxTotalBytes) {
    return `الحجم الإجمالي لملفات الحل تجاوز الحد الأقصى (${formatFileSize(
      SUBMISSION_LIMITS.maxTotalBytes,
    )}) لهذا الواجب`;
  }
  return null;
}

/**
 * Validates a batch of newly-picked files against an assignment's
 * attachment limits (10 files / 5GB total), accounting for files
 * already attached to that assignment — so adding files in batches to
 * the same assignment can never push it past either cap, whether this
 * runs on the create form (existingCount/existingTotalBytes = 0) or a
 * future "add more attachments" flow on an existing assignment.
 */
export function validateAssignmentAttachmentBatch(
  existingCount: number,
  existingTotalBytes: number,
  newFiles: { size: number }[],
): string | null {
  const totalCount = existingCount + newFiles.length;
  if (totalCount > ASSIGNMENT_ATTACHMENT_LIMITS.maxFiles) {
    return `الحد الأقصى لعدد المرفقات هو ${ASSIGNMENT_ATTACHMENT_LIMITS.maxFiles} ملفات لكل واجب (لديك ${existingCount} بالفعل)`;
  }

  const newBytes = newFiles.reduce((sum, f) => sum + f.size, 0);
  const totalBytes = existingTotalBytes + newBytes;
  if (totalBytes > ASSIGNMENT_ATTACHMENT_LIMITS.maxTotalBytes) {
    return `الحجم الإجمالي للمرفقات تجاوز الحد الأقصى (${formatFileSize(
      ASSIGNMENT_ATTACHMENT_LIMITS.maxTotalBytes,
    )}) لهذا الواجب`;
  }

  return null;
}
