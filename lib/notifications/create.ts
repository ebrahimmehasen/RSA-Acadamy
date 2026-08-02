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

export async function createNotification(options: {
  profileId: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string | number;
}) {
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
  const supabase = createAdminClient();
  await supabase.from("notifications").insert(
    profileIds.map((profileId) => ({
      profile_id: profileId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      related_id: payload.relatedId != null ? String(payload.relatedId) : null,
    })),
  );
}
