import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { SignOutButton } from "@/components/shared/SignOutButton";
import { ProfileForm } from "./ProfileForm";
import { TeacherCvCard } from "./TeacherCvCard";

export default async function ProfileSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  let teacherCvDriveId: string | null = null;
  if (session.profile.role === "teacher") {
    const { data: teacher } = await supabase
      .from("teachers")
      .select("cv_drive_id")
      .eq("user_id", session.profile.id)
      .maybeSingle();
    teacherCvDriveId = teacher?.cv_drive_id ?? null;
  }

  return (
    <PageShell className="mx-auto max-w-xl">
      <PageHeader title="الملف الشخصي" />
      <ProfileForm
        fullName={session.profile.full_name}
        phone={session.profile.phone}
        email={userData.user?.email ?? ""}
        pictureDriveId={session.profile.profile_picture_drive_id}
      />
      {session.profile.role === "teacher" && (
        <TeacherCvCard cvDriveId={teacherCvDriveId} />
      )}
      <SectionCard
        title="الجلسة"
        description="تسجيل الخروج من هذا الجهاز"
      >
        <SignOutButton variant="outline" size="touch" />
      </SectionCard>
    </PageShell>
  );
}
