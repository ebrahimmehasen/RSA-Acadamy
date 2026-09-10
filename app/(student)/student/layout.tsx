import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/RoleShell";
import { PendingActivation } from "@/components/shared/PendingActivation";
import { ROLE_NAV } from "@/lib/roleNav";

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

  return (
    <RoleShell
      title={title}
      fullName={session.profile.full_name}
      profileId={session.profile.id}
      nav={nav}
      density={density}
    >
      {children}
    </RoleShell>
  );
}
