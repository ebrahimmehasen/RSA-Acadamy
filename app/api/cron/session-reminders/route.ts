import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { DAYS } from "@/lib/schedule";

/**
 * Decision #20: admin-configurable per-user reminder window
 * (5/10/15/30 min before class start), stored in notification_settings.
 * Meant to run every 5 minutes (see vercel.json) — a slot is notified
 * once when "minutes until start" first drops into a user's chosen
 * bucket, using a 5-minute-wide window matching the cron interval so
 * no run is missed or double-fires.
 */
const CRON_INTERVAL_MINUTES = 5;

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  const supabase = createAdminClient();

  // class_assignments.start_time is a naive wall-clock value entered
  // by the admin in school-local time (Africa/Cairo) — comparing it
  // against UTC now() would be off by Cairo's UTC offset (+2/+3
  // depending on DST rules that have flip-flopped in Egypt in recent
  // years), so resolve "now" via Intl in the same timezone instead of
  // hardcoding an offset.
  const now = new Date();
  const cairoParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    weekday: "long",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const partValue = (type: string) =>
    cairoParts.find((p) => p.type === type)?.value ?? "";
  const weekdayMap: Record<string, (typeof DAYS)[number]> = {
    Saturday: "saturday",
    Sunday: "sunday",
    Monday: "monday",
    Tuesday: "tuesday",
    Wednesday: "wednesday",
    Thursday: "thursday",
    Friday: "friday",
  };
  const dayOfWeek = weekdayMap[partValue("weekday")];
  const nowMinutes =
    Number(partValue("hour")) * 60 + Number(partValue("minute"));

  const { data: slots } = await supabase
    .from("class_assignments")
    .select("id, class_id, teacher_id, start_time")
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true);

  let notified = 0;

  for (const slot of slots ?? []) {
    const [h, m] = slot.start_time.split(":").map(Number);
    const startMinutes = h * 60 + m;
    const minutesUntil = startMinutes - nowMinutes;
    if (minutesUntil < 0 || minutesUntil > 30) continue;

    const { data: students } = await supabase
      .from("students")
      .select("user_id")
      .eq("class_id", slot.class_id)
      .eq("is_active", true);

    const recipientIds = [
      ...(students ?? []).map((s) => s.user_id),
      ...(slot.teacher_id ? [slot.teacher_id] : []),
    ];

    for (const profileId of recipientIds) {
      const { data: settings } = await supabase
        .from("notification_settings")
        .select("class_reminder_enabled, class_reminder_minutes")
        .eq("profile_id", profileId)
        .maybeSingle();
      const enabled = settings?.class_reminder_enabled ?? true;
      const reminderMinutes = settings?.class_reminder_minutes ?? 15;
      if (!enabled) continue;
      if (
        minutesUntil > reminderMinutes ||
        minutesUntil <= reminderMinutes - CRON_INTERVAL_MINUTES
      ) {
        continue;
      }

      const relatedId = `${slot.id}-${now.toISOString().slice(0, 10)}`;
      const { data: alreadySent } = await supabase
        .from("notifications")
        .select("id")
        .eq("profile_id", profileId)
        .eq("type", "schedule")
        .eq("related_id", relatedId)
        .maybeSingle();
      if (alreadySent) continue;

      await createNotification({
        profileId,
        type: "schedule",
        title: "حصتك هتبدأ قريب ⏰",
        message: `الحصة هتبدأ الساعة ${slot.start_time.slice(0, 5)}`,
        relatedId,
      });
      notified++;
    }
  }

  return NextResponse.json({ ok: true, notified });
}
