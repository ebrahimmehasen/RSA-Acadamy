import { createAdminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SimpleBarChart } from "@/components/charts/SimpleBarChart";

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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">التقارير</h1>
      <p className="text-sm text-muted-foreground">
        تتبع الحضور غير متاح بعد — مؤجل لمرحلة لاحقة
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">متوسط الدرجات حسب الفصل</CardTitle>
          <CardDescription>نسبة مئوية من الدرجة العظمى</CardDescription>
        </CardHeader>
        <CardContent>
          {gradesChart.length > 0 ? (
            <SimpleBarChart data={gradesChart} valueSuffix="%" color="#0f8a72" />
          ) : (
            <p className="text-sm text-muted-foreground">
              مفيش درجات مصححة لسه
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
