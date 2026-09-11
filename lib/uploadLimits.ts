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

/** Bytes → a human-readable "X.XX GB" / "X MB" / "X KB" string. */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} بايت`;
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
