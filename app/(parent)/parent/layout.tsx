import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/RoleShell";
import { PendingActivation } from "@/components/shared/PendingActivation";
import { ROLE_NAV } from "@/lib/roleNav";

// Every page here is per-user and session-gated — never prerender.
export const dynamic = "force-dynamic";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.profile.role !== "parent") redirect("/");
  if (!session.isActive) {
    return (
      <PendingActivation
        profileId={session.profile.id}
        role="parent"
        fullName={session.profile.full_name}
      />
    );
  }

  const { title, nav, density } = ROLE_NAV.parent;

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
