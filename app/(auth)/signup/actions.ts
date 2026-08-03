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

async function readProfilePicture(
  formData: FormData,
): Promise<{ buffer: Buffer; fileName: string; mimeType: string } | null | { error: string }> {
  const file = formData.get("profile_picture") as File | null;
  if (!file || file.size === 0) return null;
  const validationError = validateUpload("profile", file.type, file.size);
  if (validationError) return { error: validationError };
  const buffer = Buffer.from(await file.arrayBuffer());
  return { buffer, fileName: file.name, mimeType: file.type };
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

    const profilePicture = await readProfilePicture(formData);
    if (profilePicture && "error" in profilePicture) {
      return { ok: false, message: profilePicture.error };
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
        profilePicture,
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
        profilePicture,
      });
    } else {
      const specialization = (formData.get("specialization") as string | null)?.trim();
      if (!specialization) {
        return { ok: false, message: "التخصص مطلوب" };
      }
      const qualification = (formData.get("qualification") as string | null) || null;
      const subjectCodes = formData.getAll("subjects") as string[];
      const cvFile = formData.get("cv") as File | null;

      if (!cvFile || cvFile.size === 0) {
        return { ok: false, message: "السيرة الذاتية (CV) مطلوبة" };
      }
      const cvValidationError = validateUpload("teacher_cv", cvFile.type, cvFile.size);
      if (cvValidationError) return { ok: false, message: cvValidationError };

      const cvBuffer = Buffer.from(await cvFile.arrayBuffer());
      await selfSignUp({
        email: parsed.email,
        password: parsed.password,
        fullName: parsed.full_name,
        phone: phoneRaw,
        role: "teacher",
        specialization,
        qualification,
        subjectCodes,
        cv: { buffer: cvBuffer, fileName: cvFile.name, mimeType: cvFile.type },
        profilePicture,
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
