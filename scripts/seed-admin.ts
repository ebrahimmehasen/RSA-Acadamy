/**
 * Creates the first admin account (auth user + profile row).
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts <email> <password> "<full name>"
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY from .env.local (bypasses RLS).
 * Idempotent: if the email already exists it just ensures the profile row.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const [email, password, fullName] = process.argv.slice(2);
  if (!email || !password || !fullName) {
    console.error(
      'Usage: npx tsx scripts/seed-admin.ts <email> <password> "<full name>"',
    );
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let userId: string;
  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError) {
    if (!createError.message.toLowerCase().includes("already")) {
      throw createError;
    }
    const { data: list, error: listError } =
      await supabase.auth.admin.listUsers();
    if (listError) throw listError;
    const existing = list.users.find((u) => u.email === email);
    if (!existing) throw new Error(`User ${email} exists but was not found`);
    userId = existing.id;
    console.log(`auth user already exists: ${userId}`);
  } else {
    userId = created.user.id;
    console.log(`auth user created: ${userId}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .upsert(
      { user_id: userId, role: "admin", full_name: fullName },
      { onConflict: "user_id" },
    )
    .select()
    .single();
  if (profileError) throw profileError;

  console.log(`admin profile ready: id=${profile.id} (${profile.full_name})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
