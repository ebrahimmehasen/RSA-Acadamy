"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createTeacher, generatePassword } from "@/lib/users";

const schema = z.object({
  full_name: z.string().min(3),
  email: z.email(),
  specialization: z.string().optional(),
  phone: z.string().optional(),
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
