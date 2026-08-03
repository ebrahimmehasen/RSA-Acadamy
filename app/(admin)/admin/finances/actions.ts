"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

const expenseSchema = z.object({
  category: z.enum(["staff_salary", "subscription", "other"]),
  description: z.string().min(2),
  amount: z.coerce.number().positive(),
  expense_date: z.string().min(1),
});

export async function addExpense(formData: FormData) {
  const session = await requireRole("admin");
  const parsed = expenseSchema.parse({
    category: formData.get("category"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    expense_date: formData.get("expense_date"),
  });

  const supabase = createAdminClient();
  const { error } = await supabase.from("expenses").insert({
    ...parsed,
    created_by: session.profile.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/finances");
}

export async function deleteExpense(formData: FormData) {
  await requireRole("admin");
  const id = z.coerce.number().int().positive().parse(formData.get("expense_id"));

  const supabase = createAdminClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/finances");
}

const subscriptionSchema = z.object({
  service_name: z.string().min(2),
  amount: z.coerce.number().positive(),
  billing_cycle: z.enum(["monthly", "yearly"]),
  renewal_date: z.string().min(1),
});

export async function addSubscription(formData: FormData) {
  const session = await requireRole("admin");
  const parsed = subscriptionSchema.parse({
    service_name: formData.get("service_name"),
    amount: formData.get("amount"),
    billing_cycle: formData.get("billing_cycle"),
    renewal_date: formData.get("renewal_date"),
  });

  const supabase = createAdminClient();
  const { error } = await supabase.from("subscriptions").insert({
    ...parsed,
    created_by: session.profile.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/finances");
}

export async function toggleSubscription(formData: FormData) {
  await requireRole("admin");
  const id = z.coerce.number().int().positive().parse(formData.get("subscription_id"));
  const isActive = formData.get("is_active") === "true";

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ is_active: !isActive })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/finances");
}

export async function renewSubscription(formData: FormData) {
  await requireRole("admin");
  const id = z.coerce.number().int().positive().parse(formData.get("subscription_id"));
  const currentRenewal = z.string().min(1).parse(formData.get("current_renewal_date"));
  const cycle = z.enum(["monthly", "yearly"]).parse(formData.get("billing_cycle"));

  const next = new Date(currentRenewal);
  if (cycle === "monthly") next.setMonth(next.getMonth() + 1);
  else next.setFullYear(next.getFullYear() + 1);

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ renewal_date: next.toISOString().slice(0, 10) })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/finances");
}
