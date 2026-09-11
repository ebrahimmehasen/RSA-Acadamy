import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { RoleShell } from "@/components/shared/RoleShell";
import { PendingActivation } from "@/components/shared/PendingActivation";
import { ProfileWarningBanner } from "@/components/shared/ProfileWarningBanner";
import { getTeacherProfileWarnings } from "@/lib/profileCompleteness";
import { ROLE_NAV } from "@/lib/roleNav";

// Every page here is per-user and session-gated — never prerender.
export const dynamic = "force-dynamic";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.profile.role !== "teacher") redirect("/");
  if (!session.isActive) {
    return (
      <PendingActivation
        profileId={session.profile.id}
        role="teacher"
        fullName={session.profile.full_name}
      />
    );
  }

  const { title, nav, density } = ROLE_NAV.teacher;

  const supabase = await createClient();
  const [{ data: teacher }, { data: preferences }] = await Promise.all([
    supabase
      .from("teachers")
      .select("cv_drive_id")
      .eq("user_id", session.profile.id)
      .maybeSingle(),
    supabase
      .from("teacher_preferences")
      .select("subjects")
      .eq("teacher_id", session.profile.id)
      .maybeSingle(),
  ]);
  const warnings = getTeacherProfileWarnings({
    phone: session.profile.phone,
    pictureDriveId: session.profile.profile_picture_drive_id,
    cvDriveId: teacher?.cv_drive_id ?? null,
    subjectsCount: ((preferences?.subjects as unknown[] | null) ?? []).length,
  });

  return (
    <RoleShell
      title={title}
      fullName={session.profile.full_name}
      profileId={session.profile.id}
      pictureDriveId={session.profile.profile_picture_drive_id}
      nav={nav}
      density={density}
      banner={<ProfileWarningBanner items={warnings} />}
    >
      {children}
    </RoleShell>
  );
}
