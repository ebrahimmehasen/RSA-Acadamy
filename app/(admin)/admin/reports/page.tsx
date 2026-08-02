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

  const [
    { data: gradedSubmissions },
    { data: paymentSubmissions },
    { data: instructions },
    { data: salaryPayments },
  ] = await Promise.all([
    supabase
      .from("assignment_submissions")
      .select("grade, assignments(max_grade, classes(class_name))")
      .eq("status", "graded")
      .not("grade", "is", null),
    supabase.from("payment_submissions").select("status, instruction_id"),
    supabase.from("payment_instructions").select("id, amount"),
    supabase.from("teacher_salary_payments").select("amount, status"),
  ]);

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

  // ---------- payments funnel ----------
  const amountByInstruction = new Map(
    (instructions ?? []).map((i) => [i.id, i.amount]),
  );
  let approvedTotal = 0;
  let pendingCount = 0;
  let rejectedCount = 0;
  let approvedCount = 0;
  for (const sub of paymentSubmissions ?? []) {
    if (sub.status === "approved") {
      approvedCount++;
      approvedTotal += amountByInstruction.get(sub.instruction_id) ?? 0;
    } else if (sub.status === "pending") pendingCount++;
    else if (sub.status === "rejected") rejectedCount++;
  }

  // ---------- finance summary ----------
  const totalSalariesPaid = (salaryPayments ?? [])
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">التقارير</h1>
      <p className="text-sm text-muted-foreground">
        تتبع الحضور غير متاح بعد — مؤجل لمرحلة لاحقة
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>رسوم مُحصّلة (مقبولة)</CardDescription>
            <CardTitle className="text-3xl" dir="ltr">
              {approvedTotal} EGP
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>رواتب مدفوعة</CardDescription>
            <CardTitle className="text-3xl" dir="ltr">
              {totalSalariesPaid} EGP
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>دفعات قيد المراجعة</CardDescription>
            <CardTitle className="text-3xl">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">حالة إثباتات الدفع</CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleBarChart
            data={[
              { label: "مقبولة", value: approvedCount },
              { label: "قيد المراجعة", value: pendingCount },
              { label: "مرفوضة", value: rejectedCount },
            ]}
            color="var(--primary)"
          />
        </CardContent>
      </Card>

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
