import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/RoleShell";
import { PendingActivation } from "@/components/shared/PendingActivation";

const NAV = [
  { href: "/teacher/dashboard", label: "الرئيسية" },
  { href: "/teacher/classes", label: "الفصول" },
  { href: "/teacher/assignments", label: "الواجبات" },
  { href: "/teacher/quizzes", label: "الاختبارات" },
  { href: "/teacher/sessions", label: "الحصص المسجلة" },
  { href: "/teacher/preferences", label: "التفضيلات" },
  { href: "/announcements", label: "الإعلانات" },
  { href: "/settings/profile", label: "الملف الشخصي" },
  { href: "/settings/notifications", label: "الإشعارات" },
  { href: "/settings/security", label: "الأمان" },
];

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

  return (
    <RoleShell
      title="بوابة المدرس"
      fullName={session.profile.full_name}
      profileId={session.profile.id}
      nav={NAV}
    >
      {children}
    </RoleShell>
  );
}
