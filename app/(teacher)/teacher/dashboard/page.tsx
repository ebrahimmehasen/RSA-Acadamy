import { CalendarDays, ClipboardList, FileQuestion } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { type ScheduleSlot } from "@/lib/schedule";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatGrid } from "@/components/shared/StatGrid";
import { StatCard } from "@/components/shared/StatCard";
import { ScheduleSpotlight } from "@/components/shared/ScheduleSpotlight";

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

  const [{ data: slots }, { data: assignments }, { data: quizzes }] =
    await Promise.all([
      supabase
        .from("class_assignments")
        .select("*, subjects(subject_name), classes(class_name)")
        .eq("teacher_id", teacherId)
        .eq("is_active", true),
      supabase.from("assignments").select("id").eq("teacher_id", teacherId),
      supabase.from("quizzes").select("id").eq("teacher_id", teacherId),
    ]);

  const typedSlots = (slots ?? []) as (ScheduleSlot & {
    subjects: { subject_name: string } | null;
    classes: { class_name: string } | null;
  })[];
  const todayClassesCount = typedSlots.filter(
    (s) => s.day_of_week === todayCairo,
  ).length;

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
      <ScheduleSpotlight
        entries={typedSlots.map((s) => ({
          id: s.id,
          day: s.day_of_week,
          start: s.start_time,
          end: s.end_time,
          subject: s.subjects?.subject_name ?? s.subject_id,
          zoomLink: s.zoom_link,
          zoomPasscode: s.zoom_passcode,
        }))}
        zoomLabel="بدء الحصة"
      />
      <StatGrid cols={3}>
        <StatCard
          label="حصص اليوم"
          value={todayClassesCount ?? 0}
          icon={CalendarDays}
          hint="حصة مجدولة اليوم"
          href="/teacher/classes"
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
