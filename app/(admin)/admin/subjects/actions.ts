"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BranchScope } from "@/lib/subjects";

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

export interface SubjectScopeResult {
  ok: boolean;
  message: string;
}

/**
 * Who studies this subject (Arabic / Languages / both). Students'
 * enrollments are updated in the same DB transaction
 * (set_subject_branch_scope, migration 0031).
 */
export async function setSubjectScope(
  subjectId: string,
  scope: BranchScope,
): Promise<SubjectScopeResult> {
  try {
    await requireRole("admin");
    const parsed = z
      .object({ subjectId: z.string().min(1), scope: z.enum(["Arabic", "Languages", "Both"]) })
      .parse({ subjectId, scope });

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("set_subject_branch_scope", {
      p_subject_id: parsed.subjectId,
      p_scope: parsed.scope,
    });
    if (error) throw new Error(error.message);

    const { enrolled = 0, removed = 0 } = (data ?? {}) as { enrolled?: number; removed?: number };
    revalidatePath("/admin/subjects");
    revalidatePath("/admin/schedule");
    return {
      ok: true,
      message: `تم — أُضيف ${enrolled} طالب، وأُزيل ${removed}`,
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "حدث خطأ" };
  }
}
