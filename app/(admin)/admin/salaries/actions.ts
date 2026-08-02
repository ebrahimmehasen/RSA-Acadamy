"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setSalary(formData: FormData) {
  await requireRole("admin");
  const teacherId = z.coerce.number().int().parse(formData.get("teacher_id"));
  const amount = z.coerce.number().min(0).parse(formData.get("salary_amount"));
  const paymentDay = z.coerce
    .number()
    .int()
    .min(1)
    .max(28)
    .parse(formData.get("payment_day") || 25);

  const supabase = createAdminClient();
  const { error } = await supabase.from("teacher_salaries").upsert(
    {
      teacher_id: teacherId,
      salary_amount: amount,
      payment_day: paymentDay,
    },
    { onConflict: "teacher_id" },
  );
  if (error) throw new Error(error.message);

  revalidatePath("/admin/salaries");
}

export async function markSalaryPaid(formData: FormData) {
  const session = await requireRole("admin");
  const teacherId = z.coerce.number().int().parse(formData.get("teacher_id"));
  const month = z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .parse(formData.get("month"));
  const transactionRef = String(formData.get("transaction_ref") ?? "").trim();

  const supabase = createAdminClient();

  const { data: salary } = await supabase
    .from("teacher_salaries")
    .select("id, salary_amount, currency")
    .eq("teacher_id", teacherId)
    .maybeSingle();
  if (!salary) throw new Error("حدد راتب المدرس الأول");

  const { error } = await supabase.from("teacher_salary_payments").upsert(
    {
      teacher_id: teacherId,
      salary_id: salary.id,
      amount: salary.salary_amount,
      currency: salary.currency,
      month,
      payment_date: new Date().toISOString().slice(0, 10),
      transaction_ref: transactionRef || null,
      status: "paid",
      marked_by: session.profile.id,
    },
    { onConflict: "teacher_id,month" },
  );
  if (error) throw new Error(error.message);

  revalidatePath("/admin/salaries");
}
