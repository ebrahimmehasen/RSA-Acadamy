"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createParent,
  deleteAccount,
  generatePassword,
  resetAccountPassword,
  updateAccountProfile,
} from "@/lib/users";
import { logAdminEdit } from "@/lib/adminLog";

export async function deleteParent(formData: FormData) {
  await requireRole("admin");
  const id = z.coerce.number().int().parse(formData.get("parent_id"));
  await deleteAccount(id);
  revalidatePath("/admin/parents");
}

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

const editSchema = z.object({
  full_name: z.string().min(3),
  email: z.email(),
  phone: z.string().min(8, "رقم الهاتف مطلوب"),
  address: z.string().optional(),
});

export interface EditParentResult {
  ok: boolean;
  message: string;
}

export async function editParentAction(
  _prev: EditParentResult | null,
  formData: FormData,
): Promise<EditParentResult> {
  try {
    const session = await requireRole("admin");
    const parentId = z.coerce
      .number()
      .int()
      .positive()
      .parse(formData.get("parent_id"));
    const parsed = editSchema.parse({
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      address: formData.get("address") || undefined,
    });

    await updateAccountProfile(parentId, {
      fullName: parsed.full_name,
      phone: parsed.phone,
      email: parsed.email,
    });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("parents")
      .update({ address: parsed.address ?? null })
      .eq("user_id", parentId);
    if (error) throw new Error(error.message);

    await logAdminEdit({
      adminId: session.profile.id,
      adminName: session.profile.full_name,
      targetType: "parent",
      targetId: parentId,
      description: "تعديل بيانات الحساب (الاسم/الإيميل/الهاتف/العنوان)",
    });

    revalidatePath(`/admin/parents/${parentId}`);
    revalidatePath("/admin/parents");
    return { ok: true, message: "تم حفظ التعديلات" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "حصل خطأ",
    };
  }
}

export interface ResetPasswordResult {
  ok: boolean;
  message: string;
  password?: string;
}

export async function resetParentPasswordAction(
  _prev: ResetPasswordResult | null,
  formData: FormData,
): Promise<ResetPasswordResult> {
  try {
    const session = await requireRole("admin");
    const parentId = z.coerce
      .number()
      .int()
      .positive()
      .parse(formData.get("parent_id"));
    const password = await resetAccountPassword(parentId);
    await logAdminEdit({
      adminId: session.profile.id,
      adminName: session.profile.full_name,
      targetType: "parent",
      targetId: parentId,
      description: "إعادة تعيين كلمة السر",
    });
    return { ok: true, message: "تم إعادة تعيين كلمة السر", password };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "حصل خطأ",
    };
  }
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
