"use server";

import { z } from "zod";
import { selfSignUp } from "@/lib/users";

const schema = z.object({
  full_name: z.string().min(3),
  email: z.email(),
  password: z.string().min(8),
  phone: z.string().optional(),
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
    const parsed = schema.parse({
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      password: formData.get("password"),
      phone: formData.get("phone") || undefined,
      role: formData.get("role"),
    });

    await selfSignUp({
      email: parsed.email,
      password: parsed.password,
      fullName: parsed.full_name,
      phone: parsed.phone ?? null,
      role: parsed.role,
    });

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
