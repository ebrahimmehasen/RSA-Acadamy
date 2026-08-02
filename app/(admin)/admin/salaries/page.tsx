import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { markSalaryPaid, setSalary } from "./actions";

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default async function AdminSalariesPage() {
  const supabase = createAdminClient();
  const month = currentMonth();

  const [{ data: teachers }, { data: salaries }, { data: payments }, { data: methods }] =
    await Promise.all([
      supabase
        .from("teachers")
        .select("user_id, is_active, profiles!teachers_user_id_fkey(full_name)")
        .eq("is_active", true),
      supabase.from("teacher_salaries").select("*"),
      supabase
        .from("teacher_salary_payments")
        .select("*")
        .eq("month", month),
      supabase
        .from("teacher_payment_methods")
        .select("*")
        .eq("is_default", true),
    ]);

  const salaryByTeacher = new Map((salaries ?? []).map((s) => [s.teacher_id, s]));
  const paymentByTeacher = new Map(
    (payments ?? []).map((p) => [p.teacher_id, p]),
  );
  const methodByTeacher = new Map(
    (methods ?? []).map((m) => [m.teacher_id, m]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">رواتب المدرسين</h1>
        <p className="text-muted-foreground">
          شهر <span dir="ltr">{month}</span> — الدفع يدوي والإدارة بتسجله هنا
        </p>
      </div>

      <div className="space-y-4">
        {(teachers ?? []).map((teacher) => {
          const profile = teacher.profiles as unknown as { full_name: string };
          const salary = salaryByTeacher.get(teacher.user_id);
          const payment = paymentByTeacher.get(teacher.user_id);
          const method = methodByTeacher.get(teacher.user_id);
          return (
            <Card key={teacher.user_id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg">
                    {profile?.full_name}
                  </CardTitle>
                  {payment ? (
                    <Badge>مدفوع لشهر {month} ✅</Badge>
                  ) : salary ? (
                    <Badge variant="secondary">مستحق</Badge>
                  ) : (
                    <Badge variant="outline">مفيش راتب محدد</Badge>
                  )}
                </div>
                {method && (
                  <CardDescription>
                    طريقة الدفع المفضلة:{" "}
                    {method.payment_method === "bank_transfer"
                      ? `تحويل بنكي (${method.bank_name ?? ""})`
                      : method.payment_method === "instapay"
                        ? `InstaPay (${method.instapay_phone ?? ""})`
                        : `محفظة ${method.wallet_provider ?? ""} (${method.wallet_phone ?? ""})`}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-6">
                <form action={setSalary} className="flex flex-wrap items-end gap-2">
                  <input
                    type="hidden"
                    name="teacher_id"
                    value={teacher.user_id}
                  />
                  <div className="space-y-1">
                    <label className="text-sm" htmlFor={`amt-${teacher.user_id}`}>
                      الراتب الشهري (جنيه)
                    </label>
                    <Input
                      id={`amt-${teacher.user_id}`}
                      name="salary_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      dir="ltr"
                      defaultValue={salary?.salary_amount ?? ""}
                      className="w-32"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm" htmlFor={`day-${teacher.user_id}`}>
                      يوم الدفع
                    </label>
                    <Input
                      id={`day-${teacher.user_id}`}
                      name="payment_day"
                      type="number"
                      min="1"
                      max="28"
                      dir="ltr"
                      defaultValue={salary?.payment_day ?? 25}
                      className="w-20"
                    />
                  </div>
                  <Button type="submit" variant="outline" size="sm">
                    حفظ الراتب
                  </Button>
                </form>

                {salary && !payment && (
                  <form
                    action={markSalaryPaid}
                    className="flex flex-wrap items-end gap-2"
                  >
                    <input
                      type="hidden"
                      name="teacher_id"
                      value={teacher.user_id}
                    />
                    <input type="hidden" name="month" value={month} />
                    <div className="space-y-1">
                      <label
                        className="text-sm"
                        htmlFor={`ref-${teacher.user_id}`}
                      >
                        مرجع التحويل (اختياري)
                      </label>
                      <Input
                        id={`ref-${teacher.user_id}`}
                        name="transaction_ref"
                        dir="ltr"
                        className="w-40"
                      />
                    </div>
                    <Button type="submit" size="sm">
                      تسجيل الدفع 💸
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
        {(teachers ?? []).length === 0 && (
          <p className="text-muted-foreground">
            مفيش مدرسين نشطين — أضفهم من صفحة المدرسين الأول.
          </p>
        )}
      </div>
    </div>
  );
}
