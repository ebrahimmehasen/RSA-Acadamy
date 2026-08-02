import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { sendEmail } from "@/lib/email/resend";
import { getAuthEmail } from "@/lib/users";

/**
 * Decision #13: reminders 5 days before the fee deadline, on the
 * deadline itself, and 3 days after (overdue) — for anyone who hasn't
 * had a payment_submission approved yet for that instruction.
 */
function daysUntil(dateStr: string): number {
  // Work entirely in UTC calendar days — using local-timezone methods
  // here (setHours, getDate) shifts the result by the server's offset
  // and silently miscounts which reminder bucket a date falls into.
  const todayUtcMidnight = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
  );
  const [year, month, day] = dateStr.slice(0, 10).split("-").map(Number);
  const targetUtcMidnight = Date.UTC(year, month - 1, day);
  return Math.round((targetUtcMidnight - todayUtcMidnight) / 86_400_000);
}

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: instructions } = await supabase
    .from("payment_instructions")
    .select("id, class_id, amount, semester, payment_deadline")
    .eq("is_active", true)
    .not("payment_deadline", "is", null);

  let notified = 0;

  for (const instruction of instructions ?? []) {
    const diff = daysUntil(instruction.payment_deadline!);
    let kind: "upcoming" | "due" | "overdue" | null = null;
    if (diff === 5) kind = "upcoming";
    else if (diff === 0) kind = "due";
    else if (diff === -3) kind = "overdue";
    if (!kind) continue;

    const { data: students } = await supabase
      .from("students")
      .select("user_id, parent_id")
      .eq("class_id", instruction.class_id)
      .eq("is_active", true);

    for (const student of students ?? []) {
      const { data: approved } = await supabase
        .from("payment_submissions")
        .select("id")
        .eq("instruction_id", instruction.id)
        .eq("student_id", student.user_id)
        .eq("status", "approved")
        .maybeSingle();
      if (approved) continue;

      const payerId = student.parent_id ?? student.user_id;

      // avoid duplicate sends if the cron re-runs the same day
      const { data: alreadySent } = await supabase
        .from("notifications")
        .select("id")
        .eq("profile_id", payerId)
        .eq("type", "payment")
        .eq("related_id", String(instruction.id))
        .gte("created_at", `${today}T00:00:00Z`)
        .maybeSingle();
      if (alreadySent) continue;

      const title =
        kind === "upcoming"
          ? "تذكير: رسوم مستحقة بعد 5 أيام"
          : kind === "due"
            ? "تذكير: رسوم مستحقة اليوم"
            : "تنبيه: رسوم متأخرة عن الموعد";
      const message = `${instruction.semester} — ${instruction.amount} جنيه`;

      await createNotification({
        profileId: payerId,
        type: "payment",
        title,
        message,
        relatedId: instruction.id,
      });

      const email = await getAuthEmail(payerId);
      if (email) {
        await sendEmail({
          to: email,
          subject: title,
          html: `<div dir="rtl"><p>${title}</p><p>${message}</p></div>`,
        });
      }
      notified++;
    }
  }

  return NextResponse.json({ ok: true, notified });
}
