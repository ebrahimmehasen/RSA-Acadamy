import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/RoleShell";

const NAV = [
  { href: "/student/dashboard", label: "الرئيسية" },
  { href: "/student/schedule", label: "الجدول" },
  { href: "/student/homework", label: "الواجبات" },
  { href: "/student/grades", label: "الدرجات" },
  { href: "/student/sessions", label: "الحصص المسجلة" },
  { href: "/student/quizzes", label: "الاختبارات" },
  { href: "/student/profile", label: "الملف الشخصي" },
  { href: "/announcements", label: "الإعلانات" },
];

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.profile.role !== "student") redirect("/");

  return (
    <RoleShell
      title="بوابة الطالب"
      fullName={session.profile.full_name}
      profileId={session.profile.id}
      nav={NAV}
    >
      {children}
    </RoleShell>
  );
}
