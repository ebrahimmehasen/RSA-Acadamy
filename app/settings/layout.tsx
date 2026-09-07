import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/RoleShell";
import { PendingActivation } from "@/components/shared/PendingActivation";
import { ROLE_NAV } from "@/lib/roleNav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { role } = session.profile;

  if (role !== "admin" && !session.isActive) {
    return (
      <PendingActivation
        profileId={session.profile.id}
        role={role}
        fullName={session.profile.full_name}
      />
    );
  }

  const { title, nav } = ROLE_NAV[role];

  return (
    <RoleShell
      title={title}
      fullName={session.profile.full_name}
      profileId={session.profile.id}
      nav={nav}
    >
      {children}
    </RoleShell>
  );
}
