"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createStudent, deleteAccount } from "@/lib/users";
import { createAdminClient } from "@/lib/supabase/admin";

const createStudentSchema = z.object({
  full_name: z.string().min(3),
  class_id: z.coerce.number().int().positive(),
  branch: z.enum(["Arabic", "Languages"]),
  phone: z.string().optional(),
});

export interface CreateStudentResult {
  ok: boolean;
  message: string;
  credentials?: { email: string; password: string; studentCode: string };
}

export async function createStudentAction(
  _prev: CreateStudentResult | null,
  formData: FormData,
): Promise<CreateStudentResult> {
  try {
    await requireRole("admin");
    const parsed = createStudentSchema.parse({
      full_name: formData.get("full_name"),
      class_id: formData.get("class_id"),
      branch: formData.get("branch"),
      phone: formData.get("phone") || undefined,
    });

    const { studentCode, email, password, enrolled } = await createStudent({
      fullName: parsed.full_name,
      phone: parsed.phone ?? null,
      classId: parsed.class_id,
      branch: parsed.branch,
    });

    revalidatePath("/admin/students");
    return {
      ok: true,
      message: `تم إنشاء الطالب وتسجيله في ${enrolled} مادة`,
      credentials: { email, password, studentCode },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "حصل خطأ",
    };
  }
}

export async function toggleStudentActive(formData: FormData) {
  await requireRole("admin");
  const id = z.coerce.number().int().parse(formData.get("student_id"));
  const active = formData.get("is_active") === "true";

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("students")
    .update({ is_active: !active })
    .eq("user_id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/students");
}

export async function deleteStudent(formData: FormData) {
  await requireRole("admin");
  const id = z.coerce.number().int().parse(formData.get("student_id"));
  await deleteAccount(id);
  revalidatePath("/admin/students");
}
