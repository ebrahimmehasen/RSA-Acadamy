import { createAdminClient } from "@/lib/supabase/admin";

export async function logSecurityEvent(options: {
  profileId: number | null;
  eventType: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createAdminClient();
  await supabase.from("security_logs").insert({
    profile_id: options.profileId,
    event_type: options.eventType,
    metadata: options.metadata ?? null,
  });
}
