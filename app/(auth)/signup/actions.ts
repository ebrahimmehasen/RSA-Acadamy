"use server";

import { z } from "zod";
import { selfSignUp } from "@/lib/users";
import { validateUpload } from "@/lib/googleDrive/upload";

const baseSchema = z.object({
  full_name: z.string().min(3),
  email: z.email(),
  password: z.string().min(8),
  role: z.enum(["student", "teacher", "parent"]),
});

export interface SignUpResult {
  ok: boolean;
  message: string;
}

export async function signUpAction(
  _prev: SignUpResult | null,
  formData: FormData,
): Promise<SignUpResult> {
  try {
    const parsed = baseSchema.parse({
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role"),
    });

    const phoneRaw = (formData.get("phone") as string | null)?.trim() || "";

    if (parsed.role === "parent" || parsed.role === "teacher") {
      if (phoneRaw.length < 8) {
        return { ok: false, message: "رقم الهاتف مطلوب" };
      }
    }

    if (parsed.role === "student") {
      const classId = formData.get("class_id");
      const branch = formData.get("branch");
      const dateOfBirth = formData.get("date_of_birth");
      await selfSignUp({
        email: parsed.email,
        password: parsed.password,
        fullName: parsed.full_name,
        phone: phoneRaw || null,
        role: "student",
        classId: classId ? Number(classId) : null,
        branch: (branch as "Arabic" | "Languages" | null) || null,
        dateOfBirth: (dateOfBirth as string | null) || null,
      });
    } else if (parsed.role === "parent") {
      const address = (formData.get("address") as string | null)?.trim();
      await selfSignUp({
        email: parsed.email,
        password: parsed.password,
        fullName: parsed.full_name,
        phone: phoneRaw,
        role: "parent",
        address: address || null,
      });
    } else {
      const specialization = (formData.get("specialization") as string | null)?.trim();
      if (!specialization) {
        return { ok: false, message: "التخصص مطلوب" };
      }
      const cvFile = formData.get("cv") as File | null;

      if (!cvFile || cvFile.size === 0) {
        return { ok: false, message: "السيرة الذاتية (CV) مطلوبة" };
      }
      const validationError = validateUpload("teacher_cv", cvFile.type, cvFile.size);
      if (validationError) return { ok: false, message: validationError };

      const buffer = Buffer.from(await cvFile.arrayBuffer());
      await selfSignUp({
        email: parsed.email,
        password: parsed.password,
        fullName: parsed.full_name,
        phone: phoneRaw,
        role: "teacher",
        specialization,
        cv: { buffer, fileName: cvFile.name, mimeType: cvFile.type },
      });
    }

    return {
      ok: true,
      message:
        "تم إنشاء الحساب بنجاح — سجّل الدخول دلوقتي. حسابك هيفضل مقفول لحد ما الإدارة تفعّله.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "حصل خطأ",
    };
  }
}
