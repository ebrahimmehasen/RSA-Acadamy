"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminEdit } from "@/lib/adminLog";

export interface StudentSearchResult {
  id: number;
  name: string;
  code: string;
  className: string;
  hasParent: boolean;
}

/** Small student roster (well under a hundred rows) — filtering in JS
 * is simpler and just as fast as a server-side ilike-on-joined-column
 * query, and avoids PostgREST's embedded-filter syntax entirely. */
export async function searchStudents(query: string): Promise<StudentSearchResult[]> {
  await requireRole("admin");
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("students")
    .select(
      "user_id, student_code, parent_id, profiles!students_user_id_fkey(full_name), classes(class_name)",
    )
    .order("user_id");

  const q = query.trim().toLowerCase();
  return (data ?? [])
    .filter((s) => {
      const name = (s.profiles as unknown as { full_name: string } | null)?.full_name?.toLowerCase() ?? "";
      return !q || name.includes(q) || s.student_code.includes(q);
    })
    .map((s) => ({
      id: s.user_id,
      name: (s.profiles as unknown as { full_name: string } | null)?.full_name ?? "—",
      code: s.student_code,
      className: (s.classes as unknown as { class_name: string } | null)?.class_name ?? "—",
      hasParent: s.parent_id !== null,
    }))
    .slice(0, 20);
}

export async function linkChild(formData: FormData) {
  const session = await requireRole("admin");
  const studentId = z.coerce.number().int().positive().parse(formData.get("student_id"));
  const parentId = z.coerce.number().int().positive().parse(formData.get("parent_id"));

  const supabase = createAdminClient();
  const { data: student, error } = await supabase
    .from("students")
    .update({ parent_id: parentId })
    .eq("user_id", studentId)
    .select("profiles!students_user_id_fkey(full_name)")
    .single();
  if (error) throw new Error(error.message);

  const studentName =
    (student?.profiles as unknown as { full_name: string } | null)?.full_name ?? "الطالب";
  await logAdminEdit({
    adminId: session.profile.id,
    adminName: session.profile.full_name,
    targetType: "parent",
    targetId: parentId,
    description: `ربط الابن "${studentName}" بولي الأمر`,
  });

  revalidatePath(`/admin/parents/${parentId}`);
}

export async function unlinkChild(formData: FormData) {
  const session = await requireRole("admin");
  const studentId = z.coerce.number().int().positive().parse(formData.get("student_id"));
  const parentId = z.coerce.number().int().positive().parse(formData.get("parent_id"));

  const supabase = createAdminClient();
  const { data: student, error } = await supabase
    .from("students")
    .update({ parent_id: null })
    .eq("user_id", studentId)
    .eq("parent_id", parentId)
    .select("profiles!students_user_id_fkey(full_name)")
    .single();
  if (error) throw new Error(error.message);

  const studentName =
    (student?.profiles as unknown as { full_name: string } | null)?.full_name ?? "الطالب";
  await logAdminEdit({
    adminId: session.profile.id,
    adminName: session.profile.full_name,
    targetType: "parent",
    targetId: parentId,
    description: `فك ربط الابن "${studentName}" من ولي الأمر`,
  });

  revalidatePath(`/admin/parents/${parentId}`);
}
