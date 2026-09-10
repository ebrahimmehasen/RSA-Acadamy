import { CalendarDays, ClipboardList, FileQuestion } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatGrid } from "@/components/shared/StatGrid";
import { StatCard } from "@/components/shared/StatCard";

export default async function TeacherDashboard() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createAdminClient();
  const teacherId = session.profile.id;

  const todayCairo = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    weekday: "long",
  })
    .format(new Date())
    .toLowerCase();

  const [{ count: todayClassesCount }, { data: assignments }, { data: quizzes }] =
    await Promise.all([
      supabase
        .from("class_assignments")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", teacherId)
        .eq("day_of_week", todayCairo)
        .eq("is_active", true),
      supabase.from("assignments").select("id").eq("teacher_id", teacherId),
      supabase.from("quizzes").select("id").eq("teacher_id", teacherId),
    ]);

  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const quizIds = (quizzes ?? []).map((q) => q.id);

  const [{ count: pendingGradingCount }, { count: pendingQuizGradingCount }] =
    await Promise.all([
      assignmentIds.length
        ? supabase
            .from("assignment_submissions")
            .select("id", { count: "exact", head: true })
            .in("assignment_id", assignmentIds)
            .eq("status", "submitted")
        : Promise.resolve({ count: 0 }),
      quizIds.length
        ? supabase
            .from("quiz_submissions")
            .select("id", { count: "exact", head: true })
            .in("quiz_id", quizIds)
            .eq("status", "submitted")
        : Promise.resolve({ count: 0 }),
    ]);

  return (
    <PageShell>
      <PageHeader title={`أهلاً أ/ ${session.profile.full_name} 👋`} />
      <StatGrid cols={3}>
        <StatCard
          label="حصص اليوم"
          value={todayClassesCount ?? 0}
          icon={CalendarDays}
          hint="حصة مجدولة اليوم"
        />
        <StatCard
          label="واجبات بانتظار التصحيح"
          value={pendingGradingCount ?? 0}
          icon={ClipboardList}
          tone={(pendingGradingCount ?? 0) > 0 ? "warning" : "default"}
          hint="تسليم بحاجة إلى تصحيح"
          href="/teacher/assignments"
        />
        <StatCard
          label="اختبارات بانتظار تصحيح يدوي"
          value={pendingQuizGradingCount ?? 0}
          icon={FileQuestion}
          tone={(pendingQuizGradingCount ?? 0) > 0 ? "warning" : "default"}
          hint="تسليم اختبار بحاجة إلى مراجعة"
          href="/teacher/quizzes"
        />
      </StatGrid>
    </PageShell>
  );
}
