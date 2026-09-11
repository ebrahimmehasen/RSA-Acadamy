import { CalendarDays, BookOpen, GraduationCap } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { type ScheduleSlot, filterSlotsForStudentBranch } from "@/lib/schedule";
import { summarizeGrades, type GradedRow } from "@/lib/grades";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatGrid } from "@/components/shared/StatGrid";
import { StatCard } from "@/components/shared/StatCard";
import { ScheduleSpotlight } from "@/components/shared/ScheduleSpotlight";

export default async function StudentDashboard() {
  const session = await getSession();
  if (!session) return null;

  const supabase = await createClient();
  const studentId = session.profile.id;

  const { data: student } = await supabase
    .from("students")
    .select("class_id, branch")
    .eq("user_id", studentId)
    .maybeSingle();

  const [{ data: slots }, { data: assignments }, { data: submissions }, { data: enrolled }] =
    await Promise.all([
      supabase
        .from("class_assignments")
        .select("*, subjects(subject_name, branch)")
        .eq("is_active", true),
      supabase.from("assignments").select("id"),
      supabase
        .from("assignment_submissions")
        .select("assignment_id, status, grade, is_late, graded_at, assignments(title, max_grade, subjects(subject_name))")
        .eq("student_id", studentId),
      supabase
        .from("student_subjects")
        .select("subject_id")
        .eq("student_id", studentId)
        .eq("is_active", true),
    ]);

  const allSlots = (slots ?? []) as (ScheduleSlot & {
    subjects: { subject_name: string; branch: string } | null;
  })[];
  const enrolledSubjectIds = new Set((enrolled ?? []).map((e) => e.subject_id));
  const mySlots = filterSlotsForStudentBranch(
    allSlots,
    student?.branch ?? null,
    enrolledSubjectIds,
  );

  const submittedIds = new Set((submissions ?? []).map((s) => s.assignment_id));
  const pendingHomework = (assignments ?? []).filter(
    (a) => !submittedIds.has(a.id),
  ).length;

  const gradedRows: GradedRow[] = (submissions ?? [])
    .filter((s) => s.status === "graded" && s.grade !== null)
    .map((s) => {
      const a = s.assignments as unknown as {
        title: string;
        max_grade: number;
        subjects: { subject_name: string } | null;
      };
      return {
        grade: s.grade!,
        max_grade: a.max_grade,
        subject_name: a.subjects?.subject_name ?? "غير محدد",
        title: a.title,
        graded_at: s.graded_at,
      };
    });
  const summary = summarizeGrades(gradedRows);

  const todayCairo = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    weekday: "long",
  })
    .format(new Date())
    .toLowerCase();
  const todayClassesCount = mySlots.filter(
    (s) => s.day_of_week === todayCairo,
  ).length;

  return (
    <PageShell>
      <PageHeader
        title={`أهلاً بك يا ${session.profile.full_name}! 👋`}
        description="يوم دراسي موفّق"
      />
      <ScheduleSpotlight
        entries={mySlots.map((s) => ({
          id: s.id,
          day: s.day_of_week,
          start: s.start_time,
          end: s.end_time,
          subject: s.subjects?.subject_name ?? s.subject_id,
          zoomLink: s.zoom_link,
          zoomPasscode: s.zoom_passcode,
        }))}
        zoomLabel="دخول الحصة"
      />
      <StatGrid cols={3}>
        <StatCard
          label="حصص اليوم"
          value={todayClassesCount}
          icon={CalendarDays}
          hint="افتح الجدول لعرض حصص اليوم"
          href="/student/schedule"
        />
        <StatCard
          label="واجبات مطلوبة"
          value={pendingHomework}
          icon={BookOpen}
          tone={pendingHomework > 0 ? "warning" : "default"}
          hint="افتح الواجبات لمتابعة المطلوب منك"
          href="/student/homework"
        />
        <StatCard
          label="متوسط الدرجات"
          value={summary.average !== null ? `${summary.average}%` : "—"}
          icon={GraduationCap}
          tone={summary.average !== null && summary.average >= 50 ? "success" : "default"}
          hint="افتح صفحة الدرجات لمتابعة نتائجك"
          href="/student/grades"
        />
      </StatGrid>
    </PageShell>
  );
}
