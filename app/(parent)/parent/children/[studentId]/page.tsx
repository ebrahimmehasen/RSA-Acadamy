import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { summarizeGrades, type GradedRow } from "@/lib/grades";
import {
  DAYS,
  DAY_LABELS,
  type ScheduleSlot,
} from "@/lib/schedule";
import { GraduationCap, ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScheduleTime } from "@/components/shared/ScheduleTime";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatGrid } from "@/components/shared/StatGrid";
import { StatCard } from "@/components/shared/StatCard";

export default async function ParentChildDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const childId = Number(studentId);
  if (!Number.isInteger(childId)) notFound();

  const session = await getSession();
  const supabase = await createClient();

  // RLS: parent can only read own children — this returns null otherwise
  const { data: child } = await supabase
    .from("students")
    .select(
      "user_id, student_code, branch, class_id, parent_id, classes(class_name), profiles!students_user_id_fkey(full_name)",
    )
    .eq("user_id", childId)
    .maybeSingle();

  if (!child || child.parent_id !== session!.profile.id) notFound();

  const [{ data: slots }, { data: assignments }, { data: submissions }] =
    await Promise.all([
      supabase
        .from("class_assignments")
        .select("*, subjects(subject_name)")
        .eq("class_id", child.class_id!)
        .eq("is_active", true)
        .order("start_time"),
      supabase
        .from("assignments")
        .select("id, title, due_date, max_grade")
        .eq("class_id", child.class_id!)
        .order("due_date", { ascending: false })
        .limit(10),
      supabase
        .from("assignment_submissions")
        .select(
          "assignment_id, status, grade, is_late, graded_at, assignments(title, max_grade, subjects(subject_name))",
        )
        .eq("student_id", childId),
    ]);

  const submissionByAssignment = new Map(
    (submissions ?? []).map((s) => [s.assignment_id, s]),
  );

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

  const profile = child.profiles as unknown as { full_name: string };
  const typedSlots = (slots ?? []) as (ScheduleSlot & {
    subjects: { subject_name: string } | null;
  })[];

  return (
    <PageShell>
      <PageHeader
        title={profile?.full_name}
        backHref="/parent/children"
        backLabel="رجوع للأبناء"
        description={`${(child.classes as unknown as { class_name: string })?.class_name} · ${child.branch === "Arabic" ? "عربي" : "لغات"}`}
      />

      <StatGrid cols={2}>
        <StatCard
          label="متوسط الدرجات"
          value={summary.average !== null ? `${summary.average}%` : "—"}
          icon={GraduationCap}
          tone={summary.average !== null && summary.average >= 50 ? "success" : "default"}
        />
        <StatCard
          label="واجبات مصححة"
          value={gradedRows.length}
          icon={ClipboardCheck}
        />
      </StatGrid>

      <SectionCard title="آخر الواجبات" contentClassName="space-y-2">
          {(assignments ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">لا توجد واجبات بعد</p>
          )}
          {(assignments ?? []).map((a) => {
            const sub = submissionByAssignment.get(a.id);
            return (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <span>{a.title}</span>
                {sub?.status === "graded" ? (
                  <Badge variant="success">
                    {sub.grade}/{a.max_grade}
                  </Badge>
                ) : sub ? (
                  <Badge variant="secondary">
                    مُسلَّم{sub.is_late ? " (متأخر)" : ""}
                  </Badge>
                ) : new Date(a.due_date) < new Date() ? (
                  <Badge variant="destructive">لم يُسلَّم</Badge>
                ) : (
                  <Badge variant="outline">مطلوب</Badge>
                )}
              </div>
            );
          })}
      </SectionCard>

      <SectionCard title="الجدول الأسبوعي" contentClassName="space-y-3">
          {typedSlots.length === 0 && (
            <p className="text-sm text-muted-foreground">لا يوجد جدول بعد</p>
          )}
          {DAYS.map((day) => {
            const daySlots = typedSlots.filter((s) => s.day_of_week === day);
            if (daySlots.length === 0) return null;
            return (
              <div key={day}>
                <p className="mb-1 font-medium">{DAY_LABELS[day]}</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {daySlots.map((slot) => (
                    <li key={slot.id}>
                      {slot.subjects?.subject_name ?? slot.subject_id}{" "}
                      (
                      <ScheduleTime
                        dayOfWeek={day}
                        startTime={slot.start_time}
                        endTime={slot.end_time}
                      />
                      )
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
      </SectionCard>
    </PageShell>
  );
}
