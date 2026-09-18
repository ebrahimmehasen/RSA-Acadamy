import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export interface SubmissionFile {
  id: string;
  name: string;
}

export interface EligibleAssignment {
  id: number;
  class_id: number;
  due_date: string;
  allow_file: boolean;
  allow_text: boolean;
}

/**
 * Can this student submit to this assignment at all? Private and normal
 * assignments never cross: a private assignment is only for its own
 * student; a normal one is never for a 'Private' student and still
 * respects its Arabic/Languages branch targeting. Mirrors the
 * assignments RLS policy — needed because writes here use the
 * service-role client.
 */
export async function checkStudentCanSubmit(
  supabase: Admin,
  studentId: number,
  assignmentId: number,
): Promise<{ ok: true; assignment: EligibleAssignment } | { ok: false; message: string }> {
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, class_id, branch, student_id, due_date, allow_file, allow_text, is_published")
    .eq("id", assignmentId)
    .single();
  if (!assignment || !assignment.is_published) {
    return { ok: false, message: "الواجب غير موجود" };
  }

  const { data: student } = await supabase
    .from("students")
    .select("class_id, branch")
    .eq("user_id", studentId)
    .single();
  if (student?.class_id !== assignment.class_id) {
    return { ok: false, message: "هذا الواجب ليس لفصلك" };
  }
  if (assignment.student_id != null) {
    if (assignment.student_id !== studentId) {
      return { ok: false, message: "هذا الواجب ليس لك" };
    }
  } else if (
    student?.branch === "Private" ||
    (assignment.branch != null && assignment.branch !== student?.branch)
  ) {
    return { ok: false, message: "هذا الواجب ليس لفصلك" };
  }
  return { ok: true, assignment: assignment as EligibleAssignment };
}

/** Files of a submission row — `files` (multi) with the legacy single file as fallback. */
export function submissionFilesOf(row: {
  files?: unknown;
  file_drive_id?: string | null;
  file_name?: string | null;
}): SubmissionFile[] {
  if (Array.isArray(row.files) && row.files.length > 0) {
    return (row.files as { id?: unknown; name?: unknown }[])
      .filter((f) => typeof f.id === "string")
      .map((f) => ({ id: f.id as string, name: typeof f.name === "string" ? f.name : "ملف" }));
  }
  if (row.file_drive_id) {
    return [{ id: row.file_drive_id, name: row.file_name ?? "ملف" }];
  }
  return [];
}

const ORPHAN_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Bytes/files this student already holds for the assignment: the files of
 * their current submission plus uploads from the last 24h that aren't
 * attached yet (an in-progress or interrupted attempt). Older unattached
 * uploads are abandoned and don't count against the 5GB.
 */
export async function studentAssignmentUsage(
  supabase: Admin,
  studentId: number,
  assignmentId: number,
  attachedIds: string[],
): Promise<{ count: number; bytes: number }> {
  const { data: rows } = await supabase
    .from("file_storage")
    .select("drive_file_id, file_size, uploaded_at")
    .eq("entity_type", "assignment")
    .eq("entity_id", String(assignmentId))
    .eq("uploaded_by", studentId)
    .is("deleted_at", null);
  const attached = new Set(attachedIds);
  const cutoff = Date.now() - ORPHAN_WINDOW_MS;
  let count = 0;
  let bytes = 0;
  for (const r of rows ?? []) {
    const isAttached = attached.has(r.drive_file_id);
    const recent = r.uploaded_at ? new Date(r.uploaded_at).getTime() >= cutoff : true;
    if (isAttached || recent) {
      count += 1;
      bytes += r.file_size ?? 0;
    }
  }
  return { count, bytes };
}
