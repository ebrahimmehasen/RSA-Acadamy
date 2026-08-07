import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/RoleShell";

const NAV = [
  { href: "/admin/dashboard", label: "الرئيسية" },
  { href: "/admin/students", label: "الطلاب" },
  { href: "/admin/teachers", label: "المدرسون" },
  { href: "/admin/parents", label: "أولياء الأمور" },
  { href: "/admin/classes", label: "الفصول والجدول" },
  { href: "/admin/subjects", label: "المواد" },
  { href: "/admin/announcements", label: "الإعلانات" },
  { href: "/admin/sessions", label: "الحصص المسجلة" },
  { href: "/admin/reports", label: "التقارير" },
  { href: "/admin/security-logs", label: "سجل الأمان" },
  { href: "/settings/profile", label: "الملف الشخصي" },
  { href: "/settings/notifications", label: "الإشعارات" },
  { href: "/settings/security", label: "الأمان" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.profile.role !== "admin") redirect("/");

  return (
    <RoleShell
      title="لوحة الإدارة"
      fullName={session.profile.full_name}
      profileId={session.profile.id}
      nav={NAV}
    >
      {children}
    </RoleShell>
  );
}
