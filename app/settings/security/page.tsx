import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { TwoFactorSettings } from "./TwoFactorSettings";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function SecuritySettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const [{ data: twoFa }, { data: userData }] = await Promise.all([
    supabase
      .from("user_2fa")
      .select("is_enabled")
      .eq("profile_id", session.profile.id)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-[var(--section-gap)]">
      <PageHeader title="إعدادات الأمان" />
      <ChangePasswordForm email={userData.user?.email ?? ""} />
      <TwoFactorSettings initiallyEnabled={!!twoFa?.is_enabled} />
    </div>
  );
}
