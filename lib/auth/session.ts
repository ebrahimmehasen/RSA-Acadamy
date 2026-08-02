import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/domain";

export interface SessionInfo {
  userId: string;
  profile: Profile;
}

/**
 * Returns the signed-in user's profile, or null when not authenticated
 * (or when the auth user has no profile row yet).
 */
export async function getSession(): Promise<SessionInfo | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (!profile) return null;

  return { userId: user.id, profile: profile as Profile };
}
