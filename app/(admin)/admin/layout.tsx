import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/RoleShell";
import { ROLE_NAV } from "@/lib/roleNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.profile.role !== "admin") redirect("/");

  const { title, nav } = ROLE_NAV.admin;

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
