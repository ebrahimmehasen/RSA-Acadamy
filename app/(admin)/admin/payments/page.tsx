import { createAdminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createInstruction,
  reviewSubmission,
  toggleInstruction,
} from "./actions";

export default async function AdminPaymentsPage() {
  const supabase = createAdminClient();

  const [{ data: classes }, { data: instructions }, { data: pending }] =
    await Promise.all([
      supabase.from("classes").select("id, class_name").order("id"),
      supabase
        .from("payment_instructions")
        .select("*, classes(class_name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("payment_submissions")
        .select(
          "*, payment_instructions(semester, amount, classes(class_name)), students!payment_submissions_student_id_fkey(student_code, profiles!students_user_id_fkey(full_name)), payer:profiles!payment_submissions_payer_id_fkey(full_name, role)",
        )
        .eq("status", "pending")
        .order("created_at"),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">إدارة المدفوعات</h1>

      {/* ---------- review queue ---------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            إثباتات دفع بانتظار المراجعة
            {(pending ?? []).length > 0 && (
              <Badge className="mr-2">{(pending ?? []).length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(pending ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              مفيش إثباتات مستنية مراجعة 🎉
            </p>
          )}
          {(pending ?? []).map((submission) => {
            const student = submission.students as unknown as {
              student_code: string;
              profiles: { full_name: string };
            };
            const payer = submission.payer as unknown as {
              full_name: string;
              role: string;
            };
            const instruction = submission.payment_instructions as unknown as {
              semester: string;
              amount: number;
              classes: { class_name: string };
            };
            return (
              <div
                key={submission.id}
                className="space-y-3 rounded-lg border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium">
                      {student?.profiles?.full_name}{" "}
                      <span className="font-mono text-muted-foreground" dir="ltr">
                        ({student?.student_code})
                      </span>
                    </p>
                    <p className="text-muted-foreground">
                      {instruction?.classes?.class_name} ·{" "}
                      {instruction?.semester} · {instruction?.amount} جنيه
                    </p>
                    <p className="text-muted-foreground">
                      الدافع: {payer?.full_name} (
                      {payer?.role === "parent" ? "ولي أمر" : "طالب"})
                      {submission.transaction_id && (
                        <span dir="ltr"> · Ref: {submission.transaction_id}</span>
                      )}
                    </p>
                    {submission.payer_message && (
                      <p className="mt-1">💬 {submission.payer_message}</p>
                    )}
                  </div>
                  <a
                    href={`/api/files/${submission.file_drive_id}`}
                    target="_blank"
                    className="text-primary underline underline-offset-4"
                  >
                    عرض الإثبات 📎
                  </a>
                </div>
                <form
                  action={reviewSubmission}
                  className="flex flex-wrap items-end gap-2"
                >
                  <input
                    type="hidden"
                    name="submission_id"
                    value={submission.id}
                  />
                  <div className="min-w-48 flex-1 space-y-1">
                    <Label htmlFor={`notes-${submission.id}`}>
                      ملاحظات (اختياري)
                    </Label>
                    <Input id={`notes-${submission.id}`} name="review_notes" />
                  </div>
                  <Button
                    type="submit"
                    name="decision"
                    value="approved"
                    size="sm"
                  >
                    قبول ✅
                  </Button>
                  <Button
                    type="submit"
                    name="decision"
                    value="rejected"
                    variant="destructive"
                    size="sm"
                  >
                    رفض
                  </Button>
                </form>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ---------- create instruction ---------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">إضافة تعليمات دفع لفصل</CardTitle>
          <CardDescription>
            بيانات التحويل البنكي اللي هتظهر لأولياء الأمور والطلاب
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={createInstruction}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div className="space-y-2">
              <Label htmlFor="class_id">الصف</Label>
              <select
                id="class_id"
                name="class_id"
                required
                className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
              >
                <option value="">اختر الصف...</option>
                {(classes ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">المبلغ (جنيه)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="1"
                required
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester">الترم</Label>
              <Input
                id="semester"
                name="semester"
                placeholder="الترم الأول 2026"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_name">اسم البنك</Label>
              <Input id="bank_name" name="bank_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_holder_name">اسم صاحب الحساب</Label>
              <Input
                id="account_holder_name"
                name="account_holder_name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_number">رقم الحساب</Label>
              <Input id="account_number" name="account_number" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input id="iban" name="iban" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_deadline">آخر موعد للدفع</Label>
              <Input
                id="payment_deadline"
                name="payment_deadline"
                type="date"
                dir="ltr"
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="instruction_message">رسالة إضافية</Label>
              <Textarea
                id="instruction_message"
                name="instruction_message"
                rows={2}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit">إضافة التعليمات</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ---------- instructions list ---------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">تعليمات الدفع الحالية</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الصف</TableHead>
                <TableHead className="text-right">الترم</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">البنك</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(instructions ?? []).map((instruction) => (
                <TableRow key={instruction.id}>
                  <TableCell>
                    {
                      (instruction.classes as unknown as { class_name: string })
                        ?.class_name
                    }
                  </TableCell>
                  <TableCell>{instruction.semester}</TableCell>
                  <TableCell dir="ltr" className="text-right">
                    {instruction.amount} EGP
                  </TableCell>
                  <TableCell>{instruction.bank_name}</TableCell>
                  <TableCell>
                    {instruction.is_active ? (
                      <Badge>نشط</Badge>
                    ) : (
                      <Badge variant="outline">موقوف</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <form action={toggleInstruction}>
                      <input
                        type="hidden"
                        name="instruction_id"
                        value={instruction.id}
                      />
                      <input
                        type="hidden"
                        name="is_active"
                        value={String(instruction.is_active)}
                      />
                      <Button variant="outline" size="xs" type="submit">
                        {instruction.is_active ? "إيقاف" : "تفعيل"}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
              {(instructions ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    مفيش تعليمات دفع لسه
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
