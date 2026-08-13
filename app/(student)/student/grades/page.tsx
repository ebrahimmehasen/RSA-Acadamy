import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { summarizeGrades, type GradedRow } from "@/lib/grades";
import { GradeTrendChart } from "@/components/charts/GradeTrendChart";
import { RealtimeRefresh } from "@/components/shared/RealtimeRefresh";
import {
  Card,
  CardContent,
  CardDescription,
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
    <div className="space-y-6">
      <RealtimeRefresh
        channelName={`grades:${session!.profile.id}`}
        watches={[
          { table: "assignment_submissions", filter: `student_id=eq.${session!.profile.id}` },
          { table: "quiz_submissions", filter: `student_id=eq.${session!.profile.id}` },
        ]}
      />
      <h1 className="text-2xl font-bold">الدرجات</h1>

      {summary.average === null ? (
        <p className="text-muted-foreground">
          مفيش درجات لسه — هتظهر هنا أول ما المدرس يصحح واجباتك.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>المتوسط العام</CardDescription>
                <CardTitle className="text-3xl">{summary.average}%</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>أفضل مادة</CardDescription>
                <CardTitle className="text-xl">
                  {summary.bySubject[0]?.subject} (
                  {summary.bySubject[0]?.average}%)
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>عدد الواجبات المصححة</CardDescription>
                <CardTitle className="text-3xl">{rows.length}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {summary.trend.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">تطور المستوى</CardTitle>
              </CardHeader>
              <CardContent>
                <GradeTrendChart data={summary.trend} />
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
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
    </div>
  );
}
