"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTeacher, generatePassword } from "@/lib/users";

export async function toggleTeacherActive(formData: FormData) {
  await requireRole("admin");
  const id = z.coerce.number().int().parse(formData.get("teacher_id"));
  const active = formData.get("is_active") === "true";

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("teachers")
    .update({ is_active: !active })
    .eq("user_id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/teachers");
}

export async function updateTeacherSubjects(formData: FormData) {
  await requireRole("admin");
  const teacherId = z.coerce.number().int().positive().parse(formData.get("teacher_id"));
  const subjectCodes = formData.getAll("subjects") as string[];

  const supabase = createAdminClient();
  const { error } = await supabase.from("teacher_preferences").upsert(
    { teacher_id: teacherId, subjects: subjectCodes },
    { onConflict: "teacher_id" },
  );
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/teachers/${teacherId}`);
}

const schema = z.object({
  full_name: z.string().min(3),
  email: z.email(),
  specialization: z.string().min(1, "التخصص مطلوب"),
  phone: z.string().min(8, "رقم الهاتف مطلوب"),
});

export interface CreateTeacherResult {
  ok: boolean;
  message: string;
  credentials?: { email: string; password: string };
}

export async function createTeacherAction(
  _prev: CreateTeacherResult | null,
  formData: FormData,
): Promise<CreateTeacherResult> {
  try {
    await requireRole("admin");
    const parsed = schema.parse({
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      specialization: formData.get("specialization") || undefined,
      phone: formData.get("phone") || undefined,
    });

    const password = generatePassword();
    await createTeacher({
      email: parsed.email,
      password,
      fullName: parsed.full_name,
      phone: parsed.phone ?? null,
      specialization: parsed.specialization ?? null,
    });

    revalidatePath("/admin/teachers");
    return {
      ok: true,
      message: "تم إنشاء حساب المدرس",
      credentials: { email: parsed.email, password },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "حصل خطأ",
    };
  }
}
