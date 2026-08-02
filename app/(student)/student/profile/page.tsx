import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PaymentProofForm } from "@/components/shared/PaymentProofForm";

const STATUS_LABEL: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "قيد المراجعة ⏳", variant: "secondary" },
  approved: { label: "مقبول ✅", variant: "default" },
  rejected: { label: "مرفوض ❌", variant: "destructive" },
};

export default async function StudentProfilePage() {
  const session = await getSession();
  const supabase = await createClient();

  const [{ data: student }, { data: subjects }] = await Promise.all([
    supabase
      .from("students")
      .select("*, classes(class_name)")
      .eq("user_id", session!.profile.id)
      .single(),
    supabase
      .from("student_subjects")
      .select("subject_id, subjects(subject_name, branch)")
      .eq("student_id", session!.profile.id)
      .eq("is_active", true),
  ]);

  const isPaymentActive = student && student.parent_id === null;

  const [{ data: instructions }, { data: submissions }] = isPaymentActive
    ? await Promise.all([
        supabase
          .from("payment_instructions")
          .select("*")
          .eq("is_active", true)
          .eq("class_id", student.class_id!),
        supabase
          .from("payment_submissions")
          .select("*")
          .eq("student_id", session!.profile.id)
          .order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الملف الشخصي</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">البيانات الشخصية</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>الاسم: {session!.profile.full_name}</p>
          <p>
            كود الطالب:{" "}
            <span className="font-mono font-bold" dir="ltr">
              {student?.student_code}
            </span>
          </p>
          <p>
            الصف:{" "}
            {(student?.classes as unknown as { class_name: string })?.class_name}
          </p>
          <p>الشعبة: {student?.branch === "Arabic" ? "عربي" : "لغات"}</p>
          <p>
            ولي الأمر:{" "}
            {student?.parent_id ? (
              <Badge>مربوط</Badge>
            ) : (
              <Badge variant="outline">غير مربوط</Badge>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">موادك الدراسية</CardTitle>
          <CardDescription>{(subjects ?? []).length} مادة</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(subjects ?? []).map((s) => {
            const subject = s.subjects as unknown as {
              subject_name: string;
            };
            return (
              <Badge key={s.subject_id} variant="secondary">
                {subject?.subject_name}
              </Badge>
            );
          })}
        </CardContent>
      </Card>

      {isPaymentActive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">الرسوم الدراسية 💳</CardTitle>
            <CardDescription>
              إنت مسؤول عن دفع رسومك (مفيش ولي أمر مربوط بحسابك)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(instructions ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                مفيش رسوم مستحقة حاليًا
              </p>
            )}
            {(instructions ?? []).map((instruction) => {
              const relevant = (submissions ?? []).filter(
                (s) => s.instruction_id === instruction.id,
              );
              const latest = relevant[0];
              const isSettled = latest?.status === "approved";
              return (
                <div
                  key={instruction.id}
                  className="space-y-3 rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {instruction.semester} — {instruction.amount} جنيه
                    </p>
                    {latest && (
                      <Badge variant={STATUS_LABEL[latest.status].variant}>
                        {STATUS_LABEL[latest.status].label}
                      </Badge>
                    )}
                  </div>
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <p>البنك: {instruction.bank_name}</p>
                    <p>صاحب الحساب: {instruction.account_holder_name}</p>
                    {instruction.account_number && (
                      <p dir="ltr" className="text-right">
                        رقم الحساب: {instruction.account_number}
                      </p>
                    )}
                    {instruction.iban && (
                      <p dir="ltr" className="text-right">
                        IBAN: {instruction.iban}
                      </p>
                    )}
                  </div>
                  {latest?.status === "rejected" && latest.review_notes && (
                    <p className="text-sm text-destructive">
                      سبب الرفض: {latest.review_notes}
                    </p>
                  )}
                  {!isSettled && latest?.status !== "pending" && (
                    <PaymentProofForm
                      instructionId={instruction.id}
                      studentId={session!.profile.id}
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
