"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SELECT_CLASS } from "@/lib/ui";
import { CopyableSecret } from "@/components/shared/CopyableSecret";
import {
  editStudentAction,
  resetStudentPasswordAction,
  type EditStudentResult,
  type ResetPasswordResult,
} from "../actions";

export function EditStudentForm({
  studentId,
  fullName,
  email,
  phone,
  classId,
  branch,
  parentId,
  classes,
  parents,
}: {
  studentId: number;
  fullName: string;
  email: string;
  phone: string | null;
  classId: number | null;
  branch: string | null;
  parentId: number | null;
  classes: { id: number; class_name: string }[];
  parents: { id: number; full_name: string }[];
}) {
  const [editResult, editAction, editPending] = useActionState<
    EditStudentResult | null,
    FormData
  >(editStudentAction, null);
  const [resetResult, resetAction, resetPending] = useActionState<
    ResetPasswordResult | null,
    FormData
  >(resetStudentPasswordAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">تعديل بيانات الطالب</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={editAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="student_id" value={studentId} />
          <div className="space-y-2">
            <Label htmlFor="full_name">الاسم الكامل</Label>
            <Input
              id="full_name"
              name="full_name"
              autoComplete="name"
              defaultValue={fullName}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              name="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              spellCheck={false}
              defaultValue={email}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">الهاتف (اختياري)</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              dir="ltr"
              autoComplete="tel"
              inputMode="tel"
              defaultValue={phone ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="class_id">الصف الدراسي</Label>
            <select
              id="class_id"
              name="class_id"
              defaultValue={classId ?? ""}
              className={SELECT_CLASS}
            >
              <option value="">—</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="branch">الشعبة</Label>
            <select
              id="branch"
              name="branch"
              defaultValue={branch ?? ""}
              className={SELECT_CLASS}
            >
              <option value="">—</option>
              <option value="Arabic">عربي</option>
              <option value="Languages">لغات</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="parent_id">ولي الأمر</Label>
            <select
              id="parent_id"
              name="parent_id"
              defaultValue={parentId ?? ""}
              className={SELECT_CLASS}
            >
              <option value="">غير مربوط</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={editPending}>
              {editPending ? "جاري الحفظ…" : "حفظ التعديلات"}
            </Button>
          </div>
        </form>
        {editResult && (
          <p
            className={`text-sm ${editResult.ok ? "text-green-600" : "text-destructive"}`}
            aria-live="polite"
          >
            {editResult.message}
          </p>
        )}

        <div className="border-t pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <form
              action={resetAction}
              onSubmit={(e) => {
                if (
                  !confirm(
                    `هل أنت متأكد من رغبتك في إعادة تعيين كلمة سر "${fullName}"؟ ستُلغى كلمة السر الحالية فورًا.`,
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="student_id" value={studentId} />
              <Button type="submit" variant="outline" disabled={resetPending}>
                {resetPending ? "جاري إعادة التعيين…" : "إعادة تعيين كلمة السر"}
              </Button>
            </form>
            {resetResult?.ok && resetResult.password && (
              <CopyableSecret value={resetResult.password} />
            )}
          </div>
          <div aria-live="polite">
            {resetResult?.ok && resetResult.password && (
              <p className="mt-2 text-xs text-muted-foreground">
                ⚠️ اضغط على المربع لنسخ كلمة السر وسلّمها إلى الطالب، فلن تظهر مرة أخرى
              </p>
            )}
            {resetResult && !resetResult.ok && (
              <p className="mt-2 text-sm text-destructive">{resetResult.message}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
