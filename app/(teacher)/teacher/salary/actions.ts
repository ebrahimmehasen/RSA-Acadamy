"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

const methodSchema = z
  .object({
    payment_method: z.enum(["bank_transfer", "instapay", "e_wallet"]),
    bank_name: z.string().optional(),
    account_holder_name: z.string().optional(),
    account_number: z.string().optional(),
    iban: z.string().optional(),
    instapay_phone: z.string().optional(),
    wallet_provider: z.string().optional(),
    wallet_phone: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.payment_method === "bank_transfer" && !value.bank_name) {
      ctx.addIssue({ code: "custom", message: "اسم البنك مطلوب" });
    }
    if (value.payment_method === "instapay" && !value.instapay_phone) {
      ctx.addIssue({ code: "custom", message: "رقم InstaPay مطلوب" });
    }
    if (value.payment_method === "e_wallet" && !value.wallet_phone) {
      ctx.addIssue({ code: "custom", message: "رقم المحفظة مطلوب" });
    }
  });

export interface SaveMethodResult {
  ok: boolean;
  message: string;
}

export async function savePaymentMethod(
  _prev: SaveMethodResult | null,
  formData: FormData,
): Promise<SaveMethodResult> {
  try {
    const session = await requireRole("teacher");
    const parsed = methodSchema.parse({
      payment_method: formData.get("payment_method"),
      bank_name: formData.get("bank_name") || undefined,
      account_holder_name: formData.get("account_holder_name") || undefined,
      account_number: formData.get("account_number") || undefined,
      iban: formData.get("iban") || undefined,
      instapay_phone: formData.get("instapay_phone") || undefined,
      wallet_provider: formData.get("wallet_provider") || undefined,
      wallet_phone: formData.get("wallet_phone") || undefined,
    });

    const supabase = createAdminClient();

    // one default method per teacher: unset previous, insert new
    await supabase
      .from("teacher_payment_methods")
      .update({ is_default: false })
      .eq("teacher_id", session.profile.id);

    const { error } = await supabase.from("teacher_payment_methods").insert({
      teacher_id: session.profile.id,
      payment_method: parsed.payment_method,
      bank_name: parsed.bank_name ?? null,
      account_holder_name: parsed.account_holder_name ?? null,
      account_number: parsed.account_number ?? null,
      iban: parsed.iban ?? null,
      instapay_phone: parsed.instapay_phone ?? null,
      wallet_provider: parsed.wallet_provider ?? null,
      wallet_phone: parsed.wallet_phone ?? null,
      is_default: true,
    });
    if (error) return { ok: false, message: error.message };

    revalidatePath("/teacher/salary");
    return { ok: true, message: "تم حفظ طريقة الدفع ✅" };
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
