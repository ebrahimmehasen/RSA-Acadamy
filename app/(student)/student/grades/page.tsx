import { GraduationCap, Star, ClipboardCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { summarizeGrades, type GradedRow } from "@/lib/grades";
import { GradeTrendChart } from "@/components/charts/GradeTrendChart";
import { RealtimeRefresh } from "@/components/shared/RealtimeRefresh";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatGrid } from "@/components/shared/StatGrid";
import { StatCard } from "@/components/shared/StatCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function StudentGradesPage() {
  const session = await getSession();
  const supabase = await createClient();

  const { data: submissions } = await supabase
    .from("assignment_submissions")
    .select(
      "grade, graded_at, assignments(title, max_grade, subjects(subject_name))",
    )
    .eq("student_id", session!.profile.id)
    .eq("status", "graded")
    .not("grade", "is", null);

  const rows: GradedRow[] = (submissions ?? []).map((s) => {
    const assignment = s.assignments as unknown as {
      title: string;
      max_grade: number;
      subjects: { subject_name: string } | null;
    };
    return {
      grade: s.grade!,
      max_grade: assignment.max_grade,
      subject_name: assignment.subjects?.subject_name ?? "غير محدد",
      title: assignment.title,
      graded_at: s.graded_at,
    };
  });

  const summary = summarizeGrades(rows);

  return (
    <PageShell>
      <RealtimeRefresh
        channelName={`grades:${session!.profile.id}`}
        watches={[
          { table: "assignment_submissions", filter: `student_id=eq.${session!.profile.id}` },
          { table: "quiz_submissions", filter: `student_id=eq.${session!.profile.id}` },
        ]}
      />
      <PageHeader title="الدرجات" />

      {summary.average === null ? (
        <EmptyState
          icon={GraduationCap}
          title="لا توجد درجات بعد"
          description="ستظهر هنا حالما يصحّح المدرس واجباتك. واصل اجتهادك!"
        />
      ) : (
        <>
          <StatGrid cols={3}>
            <StatCard
              label="المتوسط العام"
              value={`${summary.average}%`}
              icon={GraduationCap}
              tone={summary.average >= 50 ? "success" : "warning"}
            />
            <StatCard
              label="أفضل مادة"
              value={`${summary.bySubject[0]?.average}%`}
              hint={summary.bySubject[0]?.subject}
              icon={Star}
              tone="info"
            />
            <StatCard
              label="عدد الواجبات المصححة"
              value={rows.length}
              icon={ClipboardCheck}
            />
          </StatGrid>

          {summary.trend.length >= 2 && (
            <SectionCard title="تطور المستوى">
              <GradeTrendChart data={summary.trend} />
            </SectionCard>
          )}

          <div className="space-y-[var(--card-gap)]">
            {summary.bySubject.map((subject) => (
              <Card key={subject.subject}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{subject.subject}</CardTitle>
                    <span className="text-sm text-muted-foreground">
                      المتوسط: {subject.average}%
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {subject.items.map((item, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{item.title}</span>
                        <span className="font-mono" dir="ltr">
                          {item.grade}/{item.max}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
