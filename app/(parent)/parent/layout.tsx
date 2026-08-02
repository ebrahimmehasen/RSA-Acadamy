import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/RoleShell";

const NAV = [
  { href: "/parent/dashboard", label: "الرئيسية" },
  { href: "/parent/children", label: "الأبناء" },
  { href: "/parent/payments", label: "الرسوم" },
  { href: "/parent/reports", label: "التقارير" },
  { href: "/announcements", label: "الإعلانات" },
  { href: "/settings/security", label: "الأمان" },
];

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.profile.role !== "parent") redirect("/");

  return (
    <RoleShell
      title="بوابة ولي الأمر"
      fullName={session.profile.full_name}
      profileId={session.profile.id}
      nav={NAV}
    >
      {children}
    </RoleShell>
  );
}
