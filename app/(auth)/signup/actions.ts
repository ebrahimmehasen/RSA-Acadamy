"use server";

import { z } from "zod";
import { selfSignUp } from "@/lib/users";
import { ticketField } from "@/lib/uploads/ticket";

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

    // files were uploaded straight to Drive before submit; we get tickets
    const profilePictureTicket = ticketField(formData, "profile_picture_ticket");

    if (parsed.role === "student") {
      const classId = formData.get("class_id");
      const branch = formData.get("branch") as
        | "Arabic"
        | "Languages"
        | "Private"
        | null;
      const dateOfBirth = formData.get("date_of_birth") as string | null;
      const secondLanguage = formData.get("second_language") as
        | "French"
        | "German"
        | null;
      if (!classId) {
        return { ok: false, message: "الصف الدراسي مطلوب" };
      }
      if (!branch) {
        return { ok: false, message: "الشعبة مطلوبة" };
      }
      if (!dateOfBirth) {
        return { ok: false, message: "تاريخ الميلاد مطلوب" };
      }
      if (branch === "Languages" && secondLanguage !== "French" && secondLanguage !== "German") {
        return { ok: false, message: "اختيار اللغة الأجنبية الثانية مطلوب" };
      }
      await selfSignUp({
        email: parsed.email,
        password: parsed.password,
        fullName: parsed.full_name,
        phone: phoneRaw || null,
        role: "student",
        classId: Number(classId),
        branch,
        dateOfBirth,
        secondLanguage: branch === "Languages" ? secondLanguage : null,
        profilePictureTicket,
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
        profilePictureTicket,
      });
    } else {
      const specialization = (formData.get("specialization") as string | null)?.trim();
      if (!specialization) {
        return { ok: false, message: "التخصص مطلوب" };
      }
      const qualification = (formData.get("qualification") as string | null) || null;
      const subjectCodes = formData.getAll("subjects") as string[];
      const cvTicket = ticketField(formData, "cv_ticket");
      if (!cvTicket) {
        return { ok: false, message: "السيرة الذاتية (CV) مطلوبة" };
      }
      await selfSignUp({
        email: parsed.email,
        password: parsed.password,
        fullName: parsed.full_name,
        phone: phoneRaw,
        role: "teacher",
        specialization,
        qualification,
        subjectCodes,
        cvTicket,
        profilePictureTicket,
      });
    }

    return {
      ok: true,
      message:
        "تم إنشاء الحساب بنجاح — سجّل الدخول الآن. سيظل حسابك مغلقًا إلى أن تقوم الإدارة بتفعيله.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "حدث خطأ",
    };
  }
}
