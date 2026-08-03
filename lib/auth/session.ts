import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/domain";

export interface SessionInfo {
  userId: string;
  profile: Profile;
  /** false for a self-signed-up account the admin hasn't activated yet. */
  isActive: boolean;
}

const ROLE_TABLE = {
  student: "students",
  teacher: "teachers",
  parent: "parents",
} as const;

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

  let isActive = true;
  if (profile.role !== "admin") {
    const table = ROLE_TABLE[profile.role as keyof typeof ROLE_TABLE];
    const { data: sub } = await supabase
      .from(table)
      .select("is_active")
      .eq("user_id", profile.id)
      .maybeSingle();
    isActive = sub?.is_active ?? false;
  }

  return { userId: user.id, profile: profile as Profile, isActive };
}
