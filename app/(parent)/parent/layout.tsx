import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/RoleShell";
import { PendingActivation } from "@/components/shared/PendingActivation";

const NAV = [
  { href: "/parent/dashboard", label: "الرئيسية" },
  { href: "/parent/children", label: "الأبناء" },
  { href: "/parent/reports", label: "التقارير" },
  { href: "/announcements", label: "الإعلانات" },
  { href: "/settings/profile", label: "الملف الشخصي" },
  { href: "/settings/notifications", label: "الإشعارات" },
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
  if (!session.isActive) {
    return (
      <PendingActivation
        profileId={session.profile.id}
        role="parent"
        fullName={session.profile.full_name}
      />
    );
  }

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
