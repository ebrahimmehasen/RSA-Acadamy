import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/RoleShell";
import { PendingActivation } from "@/components/shared/PendingActivation";
import { ProfileWarningBanner } from "@/components/shared/ProfileWarningBanner";
import { getStudentProfileWarnings } from "@/lib/profileCompleteness";
import { ROLE_NAV } from "@/lib/roleNav";

// Every page here is per-user and session-gated — never prerender.
export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.profile.role !== "student") redirect("/");
  if (!session.isActive) {
    return (
      <PendingActivation
        profileId={session.profile.id}
        role="student"
        fullName={session.profile.full_name}
      />
    );
  }

  const { title, nav, density } = ROLE_NAV.student;

  const warnings = getStudentProfileWarnings({
    pictureDriveId: session.profile.profile_picture_drive_id,
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
