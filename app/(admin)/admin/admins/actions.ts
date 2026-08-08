"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdmin, deleteAccount } from "@/lib/users";

const schema = z.object({
  full_name: z.string().min(3, "الاسم لازم يكون 3 أحرف على الأقل"),
  email: z.email(),
  password: z.string().min(8, "كلمة السر لازم تكون 8 أحرف على الأقل"),
});

export interface CreateAdminResult {
  ok: boolean;
  message: string;
}

export async function createAdminAction(
  _prev: CreateAdminResult | null,
  formData: FormData,
): Promise<CreateAdminResult> {
  try {
    await requireRole("admin");
    const parsed = schema.parse({
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

    await createAdmin({
      email: parsed.email,
      password: parsed.password,
      fullName: parsed.full_name,
    });

    revalidatePath("/admin/admins");
    return {
      ok: true,
      message: `تم إنشاء حساب المسؤول — سلّم البريد وكلمة السر اللي كتبتها لـ ${parsed.full_name}`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof z.ZodError
          ? error.issues[0].message
          : error instanceof Error
            ? error.message
            : "حصل خطأ",
    };
  }
}

export async function deleteAdminAction(formData: FormData) {
  const session = await requireRole("admin");
  const id = z.coerce.number().int().positive().parse(formData.get("admin_id"));
  if (id === session.profile.id) {
    throw new Error("مينفعش تحذف حسابك الشخصي");
  }
  await deleteAccount(id);
  revalidatePath("/admin/admins");
}
