import Link from "next/link";
import { UsersRound, BarChart3 } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { type ScheduleSlot } from "@/lib/schedule";
import { summarizeGrades, type GradedRow } from "@/lib/grades";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatGrid } from "@/components/shared/StatGrid";
import { StatCard } from "@/components/shared/StatCard";
import { SectionCard } from "@/components/shared/SectionCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ScheduleSpotlight } from "@/components/shared/ScheduleSpotlight";
import { CARD_LINK_CLASS } from "@/lib/ui";

export default async function ParentDashboard() {
  const session = await getSession();
  if (!session) return null;

  const supabase = await createClient();
  const parentId = session.profile.id;

  const { data: children } = await supabase
    .from("students")
    .select(
      "user_id, class_id, branch, profiles!students_user_id_fkey(full_name)",
    )
    .eq("parent_id", parentId);

  const typedChildren = (children ?? []) as unknown as {
    user_id: number;
    class_id: number | null;
    branch: string | null;
    profiles: { full_name: string } | null;
  }[];
  const childIds = typedChildren.map((c) => c.user_id);
  const classIds = [...new Set(typedChildren.map((c) => c.class_id).filter(Boolean))] as number[];

  const [{ data: slots }, { data: submissions }] = await Promise.all([
    classIds.length
      ? supabase
          .from("class_assignments")
          .select("*, subjects(subject_name, branch)")
          .in("class_id", classIds)
          .eq("is_active", true)
      : Promise.resolve({ data: [] }),
    childIds.length
      ? supabase
          .from("assignment_submissions")
          .select("status, grade, graded_at, assignments(title, max_grade, subjects(subject_name))")
          .in("student_id", childIds)
      : Promise.resolve({ data: [] }),
  ]);

  const typedSlots = (slots ?? []) as (ScheduleSlot & {
    subjects: { subject_name: string; branch: string } | null;
  })[];

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

  return (
    <PageShell>
      <PageHeader title={`أهلاً ${session.profile.full_name} 👋`} />
      <StatGrid cols={2}>
        <StatCard
          label="الأبناء"
          value={typedChildren.length}
          icon={UsersRound}
          hint="اربط أبناءك بكود الطالب من صفحة الأبناء"
          href="/parent/children"
        />
        <StatCard
          label="متوسط الدرجات"
          value={summary.average !== null ? `${summary.average}%` : "—"}
          icon={BarChart3}
          tone={summary.average !== null && summary.average >= 50 ? "success" : "default"}
          hint="تابع درجات ومستوى أبنائك"
          href="/parent/reports"
        />
      </StatGrid>

      <SectionCard title="أبناؤك الآن" contentClassName="space-y-3">
        {typedChildren.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="لا يوجد أبناء مرتبطون بعد"
            description="استخدم كود الطالب من صفحة الأبناء لربط ابنك"
          />
        ) : (
          typedChildren.map((child) => {
            const childSlots = typedSlots.filter(
              (s) =>
                s.class_id === child.class_id &&
                (!child.branch || s.subjects?.branch === child.branch),
            );
            return (
              <div key={child.user_id} className="space-y-1.5">
                <Link
                  href={`/parent/children/${child.user_id}`}
                  className={`${CARD_LINK_CLASS} inline-block text-sm font-semibold hover:underline`}
                >
                  {child.profiles?.full_name}
                </Link>
                <ScheduleSpotlight
                  entries={childSlots.map((s) => ({
                    id: s.id,
                    day: s.day_of_week,
                    start: s.start_time,
                    end: s.end_time,
                    subject: s.subjects?.subject_name ?? s.subject_id,
                  }))}
                />
              </div>
            );
          })
        )}
      </SectionCard>
    </PageShell>
  );
}
