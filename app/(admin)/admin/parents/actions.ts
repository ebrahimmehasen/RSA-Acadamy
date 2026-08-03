"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { createParent, generatePassword } from "@/lib/users";

export async function toggleParentActive(formData: FormData) {
  await requireRole("admin");
  const id = z.coerce.number().int().parse(formData.get("parent_id"));
  const active = formData.get("is_active") === "true";

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("parents")
    .update({ is_active: !active })
    .eq("user_id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/parents");
}

const schema = z.object({
  full_name: z.string().min(3),
  email: z.email(),
  phone: z.string().min(8, "رقم الهاتف مطلوب"),
});

export interface CreateParentResult {
  ok: boolean;
  message: string;
  credentials?: { email: string; password: string };
}

export async function createParentAction(
  _prev: CreateParentResult | null,
  formData: FormData,
): Promise<CreateParentResult> {
  try {
    await requireRole("admin");
    const parsed = schema.parse({
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      phone: formData.get("phone") || undefined,
    });

    const password = generatePassword();
    await createParent({
      email: parsed.email,
      password,
      fullName: parsed.full_name,
      phone: parsed.phone ?? null,
    });

    revalidatePath("/admin/parents");
    return {
      ok: true,
      message: "تم إنشاء حساب ولي الأمر",
      credentials: { email: parsed.email, password },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "حصل خطأ",
    };
  }
}
