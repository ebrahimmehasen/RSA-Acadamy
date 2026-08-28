"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  class_reminder_enabled: z.boolean(),
  class_reminder_minutes: z.coerce.number().int(),
  assignment_notification: z.boolean(),
  parent_secondary_notifications: z.boolean(),
  email_notifications: z.boolean(),
});

export interface SaveNotificationSettingsResult {
  ok: boolean;
  message: string;
}

export async function saveNotificationSettings(
  _prev: SaveNotificationSettingsResult | null,
  formData: FormData,
): Promise<SaveNotificationSettingsResult> {
  try {
    const session = await requireAuth();
    const parsed = schema.parse({
      class_reminder_enabled: formData.get("class_reminder_enabled") === "on",
      class_reminder_minutes: formData.get("class_reminder_minutes") || 15,
      assignment_notification: formData.get("assignment_notification") === "on",
      parent_secondary_notifications:
        formData.get("parent_secondary_notifications") === "on",
      email_notifications: formData.get("email_notifications") === "on",
    });

    const supabase = createAdminClient();
    const { error } = await supabase.from("notification_settings").upsert(
      { profile_id: session.profile.id, ...parsed },
      { onConflict: "profile_id" },
    );
    if (error) throw new Error(error.message);

    revalidatePath("/settings/notifications");
    return { ok: true, message: "تم حفظ إعدادات الإشعارات ✅" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "حصل خطأ",
    };
  }
}
