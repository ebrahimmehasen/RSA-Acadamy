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
            <Input id="full_name" name="full_name" defaultValue={fullName} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              name="email"
              type="email"
              dir="ltr"
              defaultValue={email}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">الهاتف (اختياري)</Label>
            <Input id="phone" name="phone" dir="ltr" defaultValue={phone ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="class_id">الصف الدراسي</Label>
            <select
              id="class_id"
              name="class_id"
              defaultValue={classId ?? ""}
              className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
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
              className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
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
              className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
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
              {editPending ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </div>
        </form>
        {editResult && (
          <p
            className={`text-sm ${editResult.ok ? "text-green-600" : "text-destructive"}`}
          >
            {editResult.message}
          </p>
        )}

        <div className="border-t pt-4">
          <form action={resetAction} className="flex items-end gap-3">
            <input type="hidden" name="student_id" value={studentId} />
            <Button type="submit" variant="outline" disabled={resetPending}>
              {resetPending ? "جاري إعادة التعيين..." : "إعادة تعيين كلمة السر"}
            </Button>
          </form>
          {resetResult?.ok && resetResult.password && (
            <div className="mt-2 rounded-lg border border-green-300 bg-green-50 p-3 text-sm dark:bg-green-950">
              <p dir="ltr">
                كلمة السر الجديدة: <b>{resetResult.password}</b>
              </p>
              <p className="text-muted-foreground">
                ⚠️ انسخها دلوقتي وسلّمها للطالب — مش هتظهر تاني
              </p>
            </div>
          )}
          {resetResult && !resetResult.ok && (
            <p className="mt-2 text-sm text-destructive">{resetResult.message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
