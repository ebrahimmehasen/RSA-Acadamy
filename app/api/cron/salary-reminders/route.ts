import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { sendEmail } from "@/lib/email/resend";
import { getAuthEmail } from "@/lib/users";

/**
 * Decision #17: reminder 2 days before payment_day ("راتبك جاي يوم
 * 25"). The day-of confirmation half of decision #17 already happens
 * event-driven when admin marks a salary paid (see
 * app/(admin)/admin/salaries/actions.ts) — not duplicated here.
 */
export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  const supabase = createAdminClient();
  const today = new Date();
  const todayDay = today.getDate();
  const todayStr = today.toISOString().slice(0, 10);
  const currentMonth = todayStr.slice(0, 7);

  const { data: salaries } = await supabase
    .from("teacher_salaries")
    .select("teacher_id, salary_amount, currency, payment_day");

  let notified = 0;

  for (const salary of salaries ?? []) {
    if (salary.payment_day - todayDay !== 2) continue;

    const { data: alreadyPaid } = await supabase
      .from("teacher_salary_payments")
      .select("id")
      .eq("teacher_id", salary.teacher_id)
      .eq("month", currentMonth)
      .maybeSingle();
    if (alreadyPaid) continue;

    const { data: alreadySent } = await supabase
      .from("notifications")
      .select("id")
      .eq("profile_id", salary.teacher_id)
      .eq("type", "salary")
      .eq("related_id", `reminder-${currentMonth}`)
      .maybeSingle();
    if (alreadySent) continue;

    const title = "تذكير: راتبك هيتحول قريب";
    const message = `راتب شهر ${currentMonth} (${salary.salary_amount} ${salary.currency}) هيتحول يوم ${salary.payment_day}`;

    await createNotification({
      profileId: salary.teacher_id,
      type: "salary",
      title,
      message,
      relatedId: `reminder-${currentMonth}`,
    });

    const email = await getAuthEmail(salary.teacher_id);
    if (email) {
      await sendEmail({
        to: email,
        subject: title,
        html: `<div dir="rtl"><p>${title}</p><p>${message}</p></div>`,
      });
    }
    notified++;
  }

  return NextResponse.json({ ok: true, notified });
}
