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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addExpense,
  addSubscription,
  deleteExpense,
  renewSubscription,
  toggleSubscription,
} from "./actions";

const CATEGORY_LABEL: Record<string, string> = {
  staff_salary: "رواتب",
  subscription: "اشتراكات",
  other: "أخرى",
};

function daysUntil(dateStr: string): number {
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const [y, m, d] = dateStr.split("-").map(Number);
  const targetUtc = Date.UTC(y, m - 1, d);
  return Math.round((targetUtc - todayUtc) / 86400000);
}

export default async function AdminFinancesPage() {
  const supabase = createAdminClient();

  const [{ data: expenses }, { data: subscriptions }] = await Promise.all([
    supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
    supabase.from("subscriptions").select("*").order("renewal_date"),
  ]);

  const totalExpenses = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">المصروفات والاشتراكات</h1>
        <p className="text-muted-foreground">
          إجمالي المصروفات المسجلة: <span dir="ltr">{totalExpenses}</span> جنيه
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الاشتراكات</CardTitle>
          <CardDescription>خدمات بتتجدد دوريًا — تنبيه لو قربت</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            action={addSubscription}
            className="flex flex-wrap items-end gap-2 border-b pb-4"
          >
            <div className="space-y-1">
              <label className="text-sm" htmlFor="service_name">
                اسم الخدمة
              </label>
              <Input id="service_name" name="service_name" required className="w-40" />
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="sub_amount">
                المبلغ
              </label>
              <Input
                id="sub_amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                dir="ltr"
                required
                className="w-28"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="billing_cycle">
                الدورة
              </label>
              <select
                id="billing_cycle"
                name="billing_cycle"
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
              >
                <option value="monthly">شهري</option>
                <option value="yearly">سنوي</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="renewal_date">
                تاريخ التجديد القادم
              </label>
              <Input id="renewal_date" name="renewal_date" type="date" dir="ltr" required />
            </div>
            <Button type="submit" size="sm">
              إضافة اشتراك
            </Button>
          </form>

          <div className="space-y-2">
            {(subscriptions ?? []).map((s) => {
              const remaining = daysUntil(s.renewal_date);
              return (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {s.service_name}{" "}
                      <span className="text-sm text-muted-foreground" dir="ltr">
                        ({s.amount} EGP / {s.billing_cycle === "monthly" ? "شهر" : "سنة"})
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground" dir="ltr">
                      تجديد: {s.renewal_date}{" "}
                      {s.is_active && remaining <= 7 && (
                        <span className="text-destructive" dir="rtl">
                          — باقي {remaining} يوم ⚠️
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.is_active ? <Badge>نشط</Badge> : <Badge variant="outline">موقوف</Badge>}
                    <form action={renewSubscription}>
                      <input type="hidden" name="subscription_id" value={s.id} />
                      <input type="hidden" name="current_renewal_date" value={s.renewal_date} />
                      <input type="hidden" name="billing_cycle" value={s.billing_cycle} />
                      <Button variant="outline" size="xs" type="submit">
                        تجديد
                      </Button>
                    </form>
                    <form action={toggleSubscription}>
                      <input type="hidden" name="subscription_id" value={s.id} />
                      <input type="hidden" name="is_active" value={String(s.is_active)} />
                      <Button variant="outline" size="xs" type="submit">
                        {s.is_active ? "إيقاف" : "تفعيل"}
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })}
            {(subscriptions ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">مفيش اشتراكات مسجلة</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">المصروفات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={addExpense} className="flex flex-wrap items-end gap-2 border-b pb-4">
            <div className="space-y-1">
              <label className="text-sm" htmlFor="category">
                النوع
              </label>
              <select
                id="category"
                name="category"
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
              >
                <option value="other">أخرى</option>
                <option value="staff_salary">رواتب</option>
                <option value="subscription">اشتراكات</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="description">
                الوصف
              </label>
              <Input id="description" name="description" required className="w-48" />
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="exp_amount">
                المبلغ
              </label>
              <Input
                id="exp_amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                dir="ltr"
                required
                className="w-28"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="expense_date">
                التاريخ
              </label>
              <Input
                id="expense_date"
                name="expense_date"
                type="date"
                dir="ltr"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
            <Button type="submit" size="sm">
              إضافة مصروف
            </Button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">الوصف</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(expenses ?? []).map((e) => (
                <TableRow key={e.id}>
                  <TableCell dir="ltr">{e.expense_date}</TableCell>
                  <TableCell>{CATEGORY_LABEL[e.category] ?? e.category}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell dir="ltr">{e.amount} EGP</TableCell>
                  <TableCell>
                    <form action={deleteExpense}>
                      <input type="hidden" name="expense_id" value={e.id} />
                      <Button variant="outline" size="xs" type="submit">
                        حذف
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
              {(expenses ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    مفيش مصروفات مسجلة لسه
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
