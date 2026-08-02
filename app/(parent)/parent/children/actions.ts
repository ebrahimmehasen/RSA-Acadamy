"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export interface LinkChildResult {
  ok: boolean;
  message: string;
}

export async function linkChildByCode(
  _prev: LinkChildResult | null,
  formData: FormData,
): Promise<LinkChildResult> {
  try {
    const session = await requireRole("parent");
    const code = z
      .string()
      .regex(/^\d{6}$/, "كود الطالب 6 أرقام")
      .parse(String(formData.get("student_code") ?? "").trim());

    const supabase = createAdminClient();
    const { data: student } = await supabase
      .from("students")
      .select("user_id, parent_id, profiles!students_user_id_fkey(full_name)")
      .eq("student_code", code)
      .maybeSingle();

    if (!student) return { ok: false, message: "مفيش طالب بالكود ده" };
    if (student.parent_id === session.profile.id) {
      return { ok: false, message: "الطالب ده مربوط بيك بالفعل" };
    }
    if (student.parent_id) {
      return { ok: false, message: "الطالب ده مربوط بولي أمر آخر — كلم الإدارة" };
    }

    const { error } = await supabase
      .from("students")
      .update({ parent_id: session.profile.id })
      .eq("user_id", student.user_id);
    if (error) return { ok: false, message: error.message };

    revalidatePath("/parent/children");
    const name = (student.profiles as unknown as { full_name: string })
      ?.full_name;
    return { ok: true, message: `تم ربط ${name} بحسابك ✅` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "حصل خطأ",
    };
  }
}
