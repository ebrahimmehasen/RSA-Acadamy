import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PaymentMethodForm } from "./PaymentMethodForm";

export default async function TeacherSalaryPage() {
  const supabase = await createClient();

  // RLS scopes everything to the signed-in teacher
  const [{ data: salary }, { data: payments }, { data: methods }] =
    await Promise.all([
      supabase.from("teacher_salaries").select("*").maybeSingle(),
      supabase
        .from("teacher_salary_payments")
        .select("*")
        .order("month", { ascending: false }),
      supabase
        .from("teacher_payment_methods")
        .select("*")
        .eq("is_default", true)
        .maybeSingle(),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الراتب</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>راتبك الشهري</CardDescription>
            <CardTitle className="text-3xl">
              {salary ? (
                <span dir="ltr">
                  {salary.salary_amount} {salary.currency}
                </span>
              ) : (
                "لم يُحدد بعد"
              )}
            </CardTitle>
            {salary && (
              <CardDescription>
                يُدفع يوم {salary.payment_day} من كل شهر
              </CardDescription>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>طريقة الاستلام الحالية</CardDescription>
            <CardTitle className="text-xl">
              {methods
                ? methods.payment_method === "bank_transfer"
                  ? `تحويل بنكي — ${methods.bank_name ?? ""}`
                  : methods.payment_method === "instapay"
                    ? `InstaPay — ${methods.instapay_phone ?? ""}`
                    : `محفظة ${methods.wallet_provider ?? ""} — ${methods.wallet_phone ?? ""}`
                : "لم تُحدد"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">تحديث طريقة استلام الراتب</CardTitle>
          <CardDescription>
            البيانات دي بتظهر للإدارة عشان يحولولك عليها — التحويل نفسه بيتم
            يدويًا
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentMethodForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">سجل المدفوعات</CardTitle>
        </CardHeader>
        <CardContent>
          {(payments ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              مفيش مدفوعات مسجلة لسه
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {(payments ?? []).map((payment) => (
                <li
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <span>
                    شهر <span dir="ltr">{payment.month}</span>
                    {payment.transaction_ref && (
                      <span className="text-muted-foreground" dir="ltr">
                        {" "}
                        · Ref: {payment.transaction_ref}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <span dir="ltr">
                      {payment.amount} {payment.currency}
                    </span>
                    <Badge>{payment.status === "paid" ? "مدفوع ✅" : "معلق"}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
