"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotifications } from "@/lib/notifications/create";
import type { Role } from "@/types/domain";

const schema = z.object({
  title_ar: z.string().min(2),
  title_en: z.string().optional(),
  content_ar: z.string().min(2),
  content_en: z.string().optional(),
  target_type: z.enum(["all", "role", "class", "branch", "student"]),
  target_role: z.enum(["student", "parent", "teacher", "admin"]).optional(),
  target_class_id: z.coerce.number().int().positive().optional(),
  target_branch: z.enum(["Arabic", "Languages"]).optional(),
  target_student_code: z.string().optional(),
});

export async function createAnnouncement(formData: FormData) {
  const session = await requireRole("admin");
  const parsed = schema.parse({
    title_ar: formData.get("title_ar"),
    title_en: formData.get("title_en") || undefined,
    content_ar: formData.get("content_ar"),
    content_en: formData.get("content_en") || undefined,
    target_type: formData.get("target_type"),
    target_role: formData.get("target_role") || undefined,
    target_class_id: formData.get("target_class_id") || undefined,
    target_branch: formData.get("target_branch") || undefined,
    target_student_code: formData.get("target_student_code") || undefined,
  });

  const supabase = createAdminClient();

  let targetStudentId: number | null = null;
  if (parsed.target_type === "student") {
    if (!parsed.target_student_code) throw new Error("اكتب كود الطالب");
    const { data: student } = await supabase
      .from("students")
      .select("user_id")
      .eq("student_code", parsed.target_student_code)
      .maybeSingle();
    if (!student) throw new Error("مفيش طالب بالكود ده");
    targetStudentId = student.user_id;
  }

  const { data: announcement, error } = await supabase
    .from("announcements")
    .insert({
      admin_id: session.profile.id,
      title_ar: parsed.title_ar,
      title_en: parsed.title_en ?? null,
      content_ar: parsed.content_ar,
      content_en: parsed.content_en ?? null,
      target_type: parsed.target_type,
      target_role: parsed.target_type === "role" ? parsed.target_role : null,
      target_class_id: parsed.target_type === "class" ? parsed.target_class_id : null,
      target_branch: parsed.target_type === "branch" ? parsed.target_branch : null,
      target_student_id: targetStudentId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // fan-out notifications to matching profiles
  let query = supabase.from("profiles").select("id, role");
  if (parsed.target_type === "role" && parsed.target_role) {
    query = query.eq("role", parsed.target_role as Role);
  }
  const { data: candidateProfiles } = await query;

  let recipientIds: number[] = (candidateProfiles ?? []).map((p) => p.id);

  if (parsed.target_type === "class" && parsed.target_class_id) {
    const { data: rows } = await supabase
      .from("students")
      .select("user_id, parent_id")
      .eq("class_id", parsed.target_class_id);
    recipientIds = (rows ?? []).flatMap((r) =>
      [r.user_id, r.parent_id].filter((id): id is number => id != null),
    );
  } else if (parsed.target_type === "branch" && parsed.target_branch) {
    const { data: rows } = await supabase
      .from("students")
      .select("user_id, parent_id")
      .eq("branch", parsed.target_branch);
    recipientIds = (rows ?? []).flatMap((r) =>
      [r.user_id, r.parent_id].filter((id): id is number => id != null),
    );
  } else if (parsed.target_type === "student" && targetStudentId) {
    const { data: studentRow } = await supabase
      .from("students")
      .select("user_id, parent_id")
      .eq("user_id", targetStudentId)
      .single();
    recipientIds = [studentRow?.user_id, studentRow?.parent_id].filter(
      (id): id is number => id != null,
    );
  }

  await createNotifications(recipientIds, {
    type: "announcement",
    title: parsed.title_ar,
    message: parsed.content_ar.slice(0, 140),
    relatedId: announcement.id,
  });

  revalidatePath("/admin/announcements");
}
