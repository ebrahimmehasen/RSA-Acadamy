"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";

const instructionSchema = z.object({
  class_id: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive(),
  semester: z.string().min(2),
  bank_name: z.string().min(2),
  account_holder_name: z.string().min(2),
  account_number: z.string().optional(),
  iban: z.string().optional(),
  instruction_message: z.string().optional(),
  payment_deadline: z.string().optional(),
});

export async function createInstruction(formData: FormData) {
  const session = await requireRole("admin");
  const parsed = instructionSchema.parse({
    class_id: formData.get("class_id"),
    amount: formData.get("amount"),
    semester: formData.get("semester"),
    bank_name: formData.get("bank_name"),
    account_holder_name: formData.get("account_holder_name"),
    account_number: formData.get("account_number") || undefined,
    iban: formData.get("iban") || undefined,
    instruction_message: formData.get("instruction_message") || undefined,
    payment_deadline: formData.get("payment_deadline") || undefined,
  });

  const supabase = createAdminClient();
  const { error } = await supabase.from("payment_instructions").insert({
    ...parsed,
    account_number: parsed.account_number ?? null,
    iban: parsed.iban ?? null,
    instruction_message: parsed.instruction_message ?? null,
    payment_deadline: parsed.payment_deadline || null,
    created_by: session.profile.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/payments");
}

export async function toggleInstruction(formData: FormData) {
  await requireRole("admin");
  const id = z.coerce.number().int().parse(formData.get("instruction_id"));
  const active = formData.get("is_active") === "true";

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("payment_instructions")
    .update({ is_active: !active })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/payments");
}

export async function reviewSubmission(formData: FormData) {
  const session = await requireRole("admin");
  const id = z.coerce.number().int().parse(formData.get("submission_id"));
  const decision = z
    .enum(["approved", "rejected"])
    .parse(formData.get("decision"));
  const notes = String(formData.get("review_notes") ?? "").trim();

  const supabase = createAdminClient();
  const { data: submission, error } = await supabase
    .from("payment_submissions")
    .update({
      status: decision,
      reviewed_by: session.profile.id,
      review_notes: notes || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("payer_id")
    .single();
  if (error) throw new Error(error.message);

  if (submission) {
    await createNotification({
      profileId: submission.payer_id,
      type: "payment",
      title: decision === "approved" ? "تم قبول إثبات الدفع ✅" : "تم رفض إثبات الدفع",
      message:
        decision === "approved"
          ? "الإدارة راجعت إثبات الدفع ووافقت عليه."
          : notes
            ? `سبب الرفض: ${notes}`
            : "الإدارة رفضت إثبات الدفع — راجع البيانات وأعد الرفع.",
      relatedId: id,
    });
  }

  revalidatePath("/admin/payments");
}
