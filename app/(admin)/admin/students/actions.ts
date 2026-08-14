"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import {
  createStudent,
  deleteAccount,
  resetAccountPassword,
  updateAccountProfile,
} from "@/lib/users";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminEdit } from "@/lib/adminLog";

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

const editSchema = z.object({
  full_name: z.string().min(3),
  email: z.email(),
  phone: z.string().optional(),
  class_id: z.coerce.number().int().positive().optional(),
  branch: z.enum(["Arabic", "Languages"]).optional(),
  parent_id: z.coerce.number().int().positive().optional(),
});

export interface EditStudentResult {
  ok: boolean;
  message: string;
}

export async function editStudentAction(
  _prev: EditStudentResult | null,
  formData: FormData,
): Promise<EditStudentResult> {
  try {
    const session = await requireRole("admin");
    const studentId = z.coerce
      .number()
      .int()
      .positive()
      .parse(formData.get("student_id"));
    const parsed = editSchema.parse({
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      phone: formData.get("phone") || undefined,
      class_id: formData.get("class_id") || undefined,
      branch: formData.get("branch") || undefined,
      parent_id: formData.get("parent_id") || undefined,
    });

    await updateAccountProfile(studentId, {
      fullName: parsed.full_name,
      phone: parsed.phone ?? null,
      email: parsed.email,
    });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("students")
      .update({
        class_id: parsed.class_id ?? null,
        branch: parsed.branch ?? null,
        parent_id: parsed.parent_id ?? null,
      })
      .eq("user_id", studentId);
    if (error) throw new Error(error.message);

    await logAdminEdit({
      adminId: session.profile.id,
      adminName: session.profile.full_name,
      targetType: "student",
      targetId: studentId,
      description: `تعديل بيانات الحساب (الاسم/الإيميل/الهاتف/الصف/الشعبة/ولي الأمر)`,
    });

    revalidatePath(`/admin/students/${studentId}`);
    revalidatePath("/admin/students");
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

export async function resetStudentPasswordAction(
  _prev: ResetPasswordResult | null,
  formData: FormData,
): Promise<ResetPasswordResult> {
  try {
    const session = await requireRole("admin");
    const studentId = z.coerce
      .number()
      .int()
      .positive()
      .parse(formData.get("student_id"));
    const password = await resetAccountPassword(studentId);
    await logAdminEdit({
      adminId: session.profile.id,
      adminName: session.profile.full_name,
      targetType: "student",
      targetId: studentId,
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
