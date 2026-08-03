"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  class_id: z.coerce.number().int().positive(),
  subject_name: z.string().min(2),
  subject_code: z.string().min(2),
  branch: z.enum(["Arabic", "Languages"]),
});

export async function addSubject(formData: FormData) {
  await requireRole("admin");
  const parsed = schema.parse({
    class_id: formData.get("class_id"),
    subject_name: formData.get("subject_name"),
    subject_code: formData.get("subject_code"),
    branch: formData.get("branch"),
  });

  const supabase = createAdminClient();
  const { data: cls } = await supabase
    .from("classes")
    .select("class_short")
    .eq("id", parsed.class_id)
    .single();
  if (!cls) throw new Error("فصل غير موجود");

  const branchTag = parsed.branch === "Arabic" ? "AR" : "EN";
  const subjectId = `${cls.class_short}_${branchTag}_${parsed.subject_code.toUpperCase()}`;

  const { error } = await supabase.from("subjects").insert({
    subject_id: subjectId,
    subject_name: parsed.subject_name,
    class_id: parsed.class_id,
    branch: parsed.branch,
    subject_code: parsed.subject_code.toUpperCase(),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/subjects");
}

export async function editSubjectName(formData: FormData) {
  await requireRole("admin");
  const subjectId = z.string().min(1).parse(formData.get("subject_id"));
  const subjectName = z.string().min(2).parse(formData.get("subject_name"));

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("subjects")
    .update({ subject_name: subjectName })
    .eq("subject_id", subjectId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/subjects");
}

export async function toggleSubject(formData: FormData) {
  await requireRole("admin");
  const subjectId = z.string().min(1).parse(formData.get("subject_id"));
  const active = formData.get("is_active") === "true";

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("subjects")
    .update({ is_active: !active })
    .eq("subject_id", subjectId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/subjects");
}
