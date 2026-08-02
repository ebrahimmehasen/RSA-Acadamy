import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationType =
  | "assignment"
  | "grade"
  | "payment"
  | "schedule"
  | "quiz"
  | "session"
  | "announcement"
  | "salary";

export interface NotificationSettings {
  class_reminder_enabled: boolean;
  class_reminder_minutes: number;
  assignment_notification: boolean;
  payment_notification: boolean;
  parent_secondary_notifications: boolean;
  email_notifications: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  class_reminder_enabled: true,
  class_reminder_minutes: 15,
  assignment_notification: true,
  payment_notification: true,
  parent_secondary_notifications: false,
  email_notifications: true,
};

/** Row is created lazily — missing row means "use defaults". */
export async function getNotificationSettings(
  profileId: number,
): Promise<NotificationSettings> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("notification_settings")
    .select(
      "class_reminder_enabled, class_reminder_minutes, assignment_notification, payment_notification, parent_secondary_notifications, email_notifications",
    )
    .eq("profile_id", profileId)
    .maybeSingle();
  return data ?? DEFAULT_SETTINGS;
}

// decision #21: for parents, only these types are "secondary" (opt-in);
// everything else (grade/payment/schedule/salary) is always important.
const SECONDARY_FOR_PARENTS: NotificationType[] = ["announcement", "session", "quiz"];

async function isAllowed(
  profileId: number,
  type: NotificationType,
): Promise<boolean> {
  const supabase = createAdminClient();
  const [{ data: profile }, settings] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", profileId).single(),
    getNotificationSettings(profileId),
  ]);

  if (type === "assignment" && !settings.assignment_notification) return false;
  if (type === "payment" && !settings.payment_notification) return false;
  if (
    profile?.role === "parent" &&
    SECONDARY_FOR_PARENTS.includes(type) &&
    !settings.parent_secondary_notifications
  ) {
    return false;
  }
  return true;
}

export async function createNotification(options: {
  profileId: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string | number;
}) {
  if (!(await isAllowed(options.profileId, options.type))) return;

  const supabase = createAdminClient();
  await supabase.from("notifications").insert({
    profile_id: options.profileId,
    type: options.type,
    title: options.title,
    message: options.message,
    related_id: options.relatedId != null ? String(options.relatedId) : null,
  });
}

/** Insert the same notification for many profiles at once (broadcasts). */
export async function createNotifications(
  profileIds: number[],
  payload: Omit<Parameters<typeof createNotification>[0], "profileId">,
) {
  if (profileIds.length === 0) return;

  const allowed: number[] = [];
  for (const id of profileIds) {
    if (await isAllowed(id, payload.type)) allowed.push(id);
  }
  if (allowed.length === 0) return;

  const supabase = createAdminClient();
  await supabase.from("notifications").insert(
    allowed.map((profileId) => ({
      profile_id: profileId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      related_id: payload.relatedId != null ? String(payload.relatedId) : null,
    })),
  );
}
