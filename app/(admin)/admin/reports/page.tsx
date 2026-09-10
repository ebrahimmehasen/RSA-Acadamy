import { createAdminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SimpleBarChart } from "@/components/charts/SimpleBarChart";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

export default async function AdminReportsPage() {
  const supabase = createAdminClient();

  const { data: gradedSubmissions } = await supabase
    .from("assignment_submissions")
    .select("grade, assignments(max_grade, classes(class_name))")
    .eq("status", "graded")
    .not("grade", "is", null);

  // ---------- grades by class ----------
  const gradeByClass = new Map<string, { total: number; count: number }>();
  for (const row of gradedSubmissions ?? []) {
    const assignment = row.assignments as unknown as {
      max_grade: number;
      classes: { class_name: string } | null;
    };
    const className = assignment?.classes?.class_name ?? "غير محدد";
    const percent = ((row.grade ?? 0) / assignment.max_grade) * 100;
    const entry = gradeByClass.get(className) ?? { total: 0, count: 0 };
    entry.total += percent;
    entry.count += 1;
    gradeByClass.set(className, entry);
  }
  const gradesChart = [...gradeByClass.entries()].map(([label, { total, count }]) => ({
    label,
    value: Math.round((total / count) * 10) / 10,
  }));

  return (
    <PageShell>
      <PageHeader
        title="التقارير"
        description="تتبع الحضور غير متاح بعد — مؤجل لمرحلة لاحقة"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">متوسط الدرجات حسب الفصل</CardTitle>
          <CardDescription>نسبة مئوية من الدرجة العظمى</CardDescription>
        </CardHeader>
        <CardContent>
          {gradesChart.length > 0 ? (
            <SimpleBarChart data={gradesChart} valueSuffix="%" color="#0f8a72" />
          ) : (
            <EmptyState title="لا توجد درجات مصححة بعد" />
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
