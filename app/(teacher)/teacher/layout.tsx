import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RoleShell } from "@/components/shared/RoleShell";

const NAV = [
  { href: "/teacher/dashboard", label: "الرئيسية" },
  { href: "/teacher/classes", label: "الفصول" },
  { href: "/teacher/assignments", label: "الواجبات" },
  { href: "/teacher/quizzes", label: "الاختبارات" },
  { href: "/teacher/sessions", label: "الحصص المسجلة" },
  { href: "/teacher/preferences", label: "التفضيلات" },
  { href: "/teacher/salary", label: "الراتب" },
];

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.profile.role !== "teacher") redirect("/");

  return (
    <RoleShell
      title="بوابة المدرس"
      fullName={session.profile.full_name}
      nav={NAV}
    >
      {children}
    </RoleShell>
  );
}
