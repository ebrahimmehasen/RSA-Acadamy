import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS. Server-only by convention: never
 * import from client components. (No "server-only" package guard so
 * that CLI scripts under scripts/ can reuse it; the service key itself
 * is never exposed to the browser since it is not NEXT_PUBLIC_*.)
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
