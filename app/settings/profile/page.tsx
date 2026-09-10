import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { SignOutButton } from "@/components/shared/SignOutButton";
import { ProfileForm } from "./ProfileForm";

export default async function ProfileSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  return (
    <PageShell className="mx-auto max-w-xl">
      <PageHeader title="الملف الشخصي" />
      <ProfileForm
        fullName={session.profile.full_name}
        phone={session.profile.phone}
        email={userData.user?.email ?? ""}
        pictureDriveId={session.profile.profile_picture_drive_id}
      />
      <SectionCard
        title="الجلسة"
        description="تسجيل الخروج من هذا الجهاز"
      >
        <SignOutButton variant="outline" size="touch" />
      </SectionCard>
    </PageShell>
  );
}
