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

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "قيد المراجعة ⏳", variant: "secondary" },
  approved: { label: "مقبول ✅", variant: "default" },
  rejected: { label: "مرفوض ❌", variant: "destructive" },
};

export default async function ParentPaymentsPage() {
  const session = await getSession();
  const supabase = await createClient();

  const [{ data: children }, { data: instructions }, { data: submissions }] =
    await Promise.all([
      supabase
        .from("students")
        .select(
          "user_id, class_id, student_code, profiles!students_user_id_fkey(full_name)",
        )
        .eq("parent_id", session!.profile.id),
      supabase
        .from("payment_instructions")
        .select("*, classes(class_name)")
        .eq("is_active", true),
      supabase
        .from("payment_submissions")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الرسوم والمدفوعات</h1>

      {(children ?? []).length === 0 && (
        <p className="text-muted-foreground">
          اربط أبناءك الأول من صفحة الأبناء عشان تشوف الرسوم المستحقة.
        </p>
      )}

      {(children ?? []).map((child) => {
        const childInstructions = (instructions ?? []).filter(
          (i) => i.class_id === child.class_id,
        );
        const profile = child.profiles as unknown as { full_name: string };
        return (
          <Card key={child.user_id}>
            <CardHeader>
              <CardTitle className="text-lg">{profile?.full_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {childInstructions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  مفيش رسوم مستحقة لفصل الطالب حاليًا
                </p>
              )}
              {childInstructions.map((instruction) => {
                const relevant = (submissions ?? []).filter(
                  (s) =>
                    s.instruction_id === instruction.id &&
                    s.student_id === child.user_id,
                );
                const latest = relevant[0];
                const isSettled = latest?.status === "approved";
                return (
                  <div
                    key={instruction.id}
                    className="space-y-3 rounded-lg border p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {instruction.semester} — {instruction.amount} جنيه
                        </p>
                        {instruction.payment_deadline && (
                          <p className="text-sm text-muted-foreground">
                            آخر موعد:{" "}
                            {new Date(
                              instruction.payment_deadline,
                            ).toLocaleDateString("ar-EG")}
                          </p>
                        )}
                      </div>
                      {latest && (
                        <Badge variant={STATUS_LABEL[latest.status].variant}>
                          {STATUS_LABEL[latest.status].label}
                        </Badge>
                      )}
                    </div>

                    <div className="rounded-md bg-muted p-3 text-sm">
                      <p className="font-medium">بيانات التحويل:</p>
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
                      {instruction.instruction_message && (
                        <p className="mt-1">{instruction.instruction_message}</p>
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
                        studentId={child.user_id}
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {(submissions ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">سجل المدفوعات</CardTitle>
            <CardDescription>كل الإثباتات اللي رفعتها</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {(submissions ?? []).map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <span>
                    {new Date(s.created_at).toLocaleDateString("ar-EG")}
                    {s.transaction_id && (
                      <span className="text-muted-foreground" dir="ltr">
                        {" "}
                        · {s.transaction_id}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <a
                      href={`/api/files/${s.file_drive_id}`}
                      target="_blank"
                      className="text-primary underline underline-offset-4"
                    >
                      الإثبات 📎
                    </a>
                    <Badge variant={STATUS_LABEL[s.status].variant}>
                      {STATUS_LABEL[s.status].label}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
