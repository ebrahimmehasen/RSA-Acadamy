import { Users, GraduationCap, UsersRound, UserCog } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeacherProfileWarnings } from "@/lib/profileCompleteness";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatGrid } from "@/components/shared/StatGrid";
import { StatCard } from "@/components/shared/StatCard";

export default async function AdminDashboard() {
  const session = await getSession();
  const supabase = createAdminClient();

  const [students, teachers, parents, teacherRows, preferences] = await Promise.all([
    supabase.from("students").select("user_id, is_active"),
    supabase.from("teachers").select("user_id, is_active"),
    supabase.from("parents").select("user_id, is_active"),
    supabase
      .from("teachers")
      .select("user_id, cv_drive_id, profiles!teachers_user_id_fkey(phone, profile_picture_drive_id)"),
    supabase.from("teacher_preferences").select("teacher_id, subjects"),
  ]);

  const inactiveCount = (rows: { is_active: boolean }[] | null) =>
    (rows ?? []).filter((r) => !r.is_active).length;

  const stats = [
    {
      label: "الطلاب",
      count: (students.data ?? []).length,
      inactive: inactiveCount(students.data),
      icon: Users,
      href: "/admin/students",
    },
    {
      label: "المدرسون",
      count: (teachers.data ?? []).length,
      inactive: inactiveCount(teachers.data),
      icon: GraduationCap,
      href: "/admin/teachers",
    },
    {
      label: "أولياء الأمور",
      count: (parents.data ?? []).length,
      inactive: inactiveCount(parents.data),
      icon: UsersRound,
      href: "/admin/parents",
    },
  ] as const;

  const subjectsByTeacher = new Map(
    (preferences.data ?? []).map((p) => [
      p.teacher_id,
      ((p.subjects as unknown[] | null) ?? []).length,
    ]),
  );
  const incompleteTeacherCount = ((teacherRows.data ?? []) as unknown as {
    user_id: number;
    cv_drive_id: string | null;
    profiles: { phone: string | null; profile_picture_drive_id: string | null } | null;
  }[]).filter(
    (t) =>
      getTeacherProfileWarnings({
        phone: t.profiles?.phone ?? null,
        pictureDriveId: t.profiles?.profile_picture_drive_id ?? null,
        cvDriveId: t.cv_drive_id,
        subjectsCount: subjectsByTeacher.get(t.user_id) ?? 0,
      }).length > 0,
  ).length;

  return (
    <PageShell>
      <PageHeader title={`أهلاً ${session?.profile.full_name} 👋`} />
      <StatGrid cols={4}>
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.count}
            icon={stat.icon}
            href={stat.href}
            tone={stat.inactive > 0 ? "warning" : "default"}
            hint={stat.inactive > 0 ? `${stat.inactive} غير مُفعّل` : undefined}
          />
        ))}
        <StatCard
          label="ملفات معلمين ناقصة"
          value={incompleteTeacherCount}
          icon={UserCog}
          href="/admin/teachers"
          tone={incompleteTeacherCount > 0 ? "warning" : "default"}
          hint="بدون مواد أو CV أو صورة أو هاتف صحيح"
        />
      </StatGrid>
    </PageShell>
  );
}
