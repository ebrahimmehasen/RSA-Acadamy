import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { summarizeGrades, type GradedRow } from "@/lib/grades";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ParentReportsPage() {
  const session = await getSession();
  const supabase = await createClient();

  const { data: children } = await supabase
    .from("students")
    .select(
      "user_id, classes(class_name), profiles!students_user_id_fkey(full_name)",
    )
    .eq("parent_id", session!.profile.id);

  const reports = await Promise.all(
    (children ?? []).map(async (child) => {
      const { data: submissions } = await supabase
        .from("assignment_submissions")
        .select(
          "grade, is_late, status, assignments(title, max_grade, subjects(subject_name))",
        )
        .eq("student_id", child.user_id);

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
            graded_at: null,
          };
        });

      const submittedCount = (submissions ?? []).filter(
        (s) => s.status !== "not_submitted",
      ).length;
      const lateCount = (submissions ?? []).filter((s) => s.is_late).length;

      return {
        childId: child.user_id,
        name: (child.profiles as unknown as { full_name: string })?.full_name,
        className: (child.classes as unknown as { class_name: string })
          ?.class_name,
        summary: summarizeGrades(gradedRows),
        totalAssignments: submissions?.length ?? 0,
        submittedCount,
        lateCount,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">التقارير</h1>

      {reports.length === 0 && (
        <p className="text-muted-foreground">
          اربط أبناءك الأول من صفحة الأبناء عشان تشوف تقاريرهم
        </p>
      )}

      {reports.map((r) => (
        <Card key={r.childId}>
          <CardHeader>
            <CardTitle className="text-lg">{r.name}</CardTitle>
            <CardDescription>{r.className}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">متوسط الدرجات</p>
                <p className="text-xl font-bold">
                  {r.summary.average !== null ? `${r.summary.average}%` : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">واجبات مُسلَّمة</p>
                <p className="text-xl font-bold">
                  {r.submittedCount}/{r.totalAssignments}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">تسليمات متأخرة</p>
                <p className="text-xl font-bold">{r.lateCount}</p>
              </div>
            </div>

            {r.summary.bySubject.length > 0 && (
              <div className="space-y-1 border-t pt-3 text-sm">
                {r.summary.bySubject.map((s) => (
                  <div key={s.subject} className="flex justify-between">
                    <span>{s.subject}</span>
                    <span className="font-mono" dir="ltr">
                      {s.average}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
