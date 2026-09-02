import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Singleton row of site-wide toggles (see 0025_platform_settings.sql).
 * Read through the service-role client, same as every other admin-only
 * table in this codebase — there is no anon RLS policy for it.
 */
export async function getPlatformSettings() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("auth_enabled")
    .eq("id", 1)
    .maybeSingle();

  return {
    authEnabled: data?.auth_enabled ?? false,
  };
}
