import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/RoleShell";
import { PendingActivation } from "@/components/shared/PendingActivation";
import { ROLE_NAV } from "@/lib/roleNav";

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

  return (
    <RoleShell
      title={title}
      fullName={session.profile.full_name}
      profileId={session.profile.id}
      pictureDriveId={session.profile.profile_picture_drive_id}
      nav={nav}
      density={density}
    >
      {children}
    </RoleShell>
  );
}
