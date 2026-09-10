import { CalendarDays, BookOpen, GraduationCap } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatGrid } from "@/components/shared/StatGrid";
import { StatCard } from "@/components/shared/StatCard";

export default async function StudentDashboard() {
  const session = await getSession();

  return (
    <PageShell>
      <PageHeader
        title={`أهلاً بك يا ${session?.profile.full_name}! 👋`}
        description="يوم دراسي موفّق"
      />
      <StatGrid cols={3}>
        <StatCard
          label="حصص اليوم"
          value="—"
          icon={CalendarDays}
          hint="افتح الجدول لعرض حصص اليوم"
          href="/student/schedule"
        />
        <StatCard
          label="واجبات مطلوبة"
          value="—"
          icon={BookOpen}
          hint="افتح الواجبات لمتابعة المطلوب منك"
          href="/student/homework"
        />
        <StatCard
          label="آخر الدرجات"
          value="—"
          icon={GraduationCap}
          hint="افتح صفحة الدرجات لمتابعة نتائجك"
          href="/student/grades"
        />
      </StatGrid>
    </PageShell>
  );
}
