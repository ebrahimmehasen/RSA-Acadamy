import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

const PENDING_WINDOW_MS = 24 * 60 * 60 * 1000;

/** file_storage.entity_id of a teacher's uploaded-but-not-yet-attached files. */
export function pendingTeacherEntityId(teacherId: number): string {
  return `pending:${teacherId}`;
}

/**
 * Files/bytes a teacher already holds for an assignment: what's attached
 * to it (when editing) plus their recent (24h) uploaded-but-unattached
 * files. Older unattached uploads are abandoned and don't count.
 */
export async function teacherAttachmentUsage(
  supabase: Admin,
  teacherId: number,
  assignmentId: number | null,
): Promise<{ count: number; bytes: number }> {
  const cutoff = Date.now() - PENDING_WINDOW_MS;
  let count = 0;
  let bytes = 0;

  const { data: pending } = await supabase
    .from("file_storage")
    .select("file_size, uploaded_at")
    .eq("entity_type", "teacher_attachment")
    .eq("entity_id", pendingTeacherEntityId(teacherId))
    .eq("uploaded_by", teacherId)
    .is("deleted_at", null);
  for (const r of pending ?? []) {
    if (!r.uploaded_at || new Date(r.uploaded_at).getTime() >= cutoff) {
      count += 1;
      bytes += r.file_size ?? 0;
    }
  }

  if (assignmentId != null) {
    const { data: attached } = await supabase
      .from("file_storage")
      .select("file_size")
      .eq("entity_type", "teacher_attachment")
      .eq("entity_id", String(assignmentId))
      .is("deleted_at", null);
    for (const r of attached ?? []) {
      count += 1;
      bytes += r.file_size ?? 0;
    }
  }
  return { count, bytes };
}

/** `new_file_ids` form field → list of Drive ids (files already uploaded in chunks). */
export function parseFileIds(raw: FormDataEntryValue | null): string[] {
  if (raw == null || raw === "") return [];
  let value: unknown;
  try {
    value = JSON.parse(String(raw));
  } catch {
    throw new Error("بيانات الملفات غير صحيحة");
  }
  if (
    !Array.isArray(value) ||
    value.length > 50 ||
    value.some((id) => typeof id !== "string" || !/^[\w-]+$/.test(id)) ||
    new Set(value).size !== value.length
  ) {
    throw new Error("بيانات الملفات غير صحيحة");
  }
  return value as string[];
}

/**
 * The given ids must all be this teacher's own pending uploads — sizes and
 * names come from our registry, never from the request. Returns null if
 * any id isn't one, else the files in the given order.
 */
export async function loadPendingAttachments(
  supabase: Admin,
  teacherId: number,
  ids: string[],
): Promise<{ id: string; name: string; size: number }[] | null> {
  if (ids.length === 0) return [];
  const { data: rows } = await supabase
    .from("file_storage")
    .select("drive_file_id, file_name, file_size")
    .eq("entity_type", "teacher_attachment")
    .eq("entity_id", pendingTeacherEntityId(teacherId))
    .eq("uploaded_by", teacherId)
    .is("deleted_at", null)
    .in("drive_file_id", ids);
  const byId = new Map((rows ?? []).map((r) => [r.drive_file_id as string, r]));
  const out: { id: string; name: string; size: number }[] = [];
  for (const id of ids) {
    const r = byId.get(id);
    if (!r) return null;
    out.push({ id, name: r.file_name, size: r.file_size ?? 0 });
  }
  return out;
}

/**
 * Moves the pending files onto the assignment (they then show up like any
 * attachment) and soft-deletes this teacher's other, abandoned pending
 * uploads so they stop counting toward the limits.
 */
export async function attachPendingToAssignment(
  supabase: Admin,
  teacherId: number,
  ids: string[],
  assignmentId: number,
): Promise<void> {
  const pendingId = pendingTeacherEntityId(teacherId);
  if (ids.length > 0) {
    await supabase
      .from("file_storage")
      .update({ entity_id: String(assignmentId) })
      .eq("entity_type", "teacher_attachment")
      .eq("entity_id", pendingId)
      .eq("uploaded_by", teacherId)
      .in("drive_file_id", ids);
  }
  const { data: leftovers } = await supabase
    .from("file_storage")
    .select("drive_file_id")
    .eq("entity_type", "teacher_attachment")
    .eq("entity_id", pendingId)
    .eq("uploaded_by", teacherId)
    .is("deleted_at", null);
  const abandoned = (leftovers ?? []).map((r) => r.drive_file_id as string);
  if (abandoned.length > 0) {
    await supabase
      .from("file_storage")
      .update({ deleted_at: new Date().toISOString() })
      .eq("entity_type", "teacher_attachment")
      .eq("entity_id", pendingId)
      .eq("uploaded_by", teacherId)
      .in("drive_file_id", abandoned);
  }
}
