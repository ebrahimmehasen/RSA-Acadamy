import { Users, GraduationCap, UsersRound } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatGrid } from "@/components/shared/StatGrid";
import { StatCard } from "@/components/shared/StatCard";

export default async function AdminDashboard() {
  const session = await getSession();
  const supabase = createAdminClient();

  const [students, teachers, parents] = await Promise.all([
    supabase.from("students").select("user_id", { count: "exact", head: true }),
    supabase.from("teachers").select("user_id", { count: "exact", head: true }),
    supabase.from("parents").select("user_id", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "الطلاب", count: students.count ?? 0, icon: Users, href: "/admin/students" },
    { label: "المدرسون", count: teachers.count ?? 0, icon: GraduationCap, href: "/admin/teachers" },
    { label: "أولياء الأمور", count: parents.count ?? 0, icon: UsersRound, href: "/admin/parents" },
  ] as const;

  return (
    <PageShell>
      <PageHeader title={`أهلاً ${session?.profile.full_name} 👋`} />
      <StatGrid cols={3}>
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.count}
            icon={stat.icon}
            href={stat.href}
          />
        ))}
      </StatGrid>
    </PageShell>
  );
}
