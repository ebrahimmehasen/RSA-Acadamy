"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/shared/SectionCard";
import { SELECT_CLASS } from "@/lib/ui";
import {
  createStudentAction,
  type CreateStudentResult,
} from "./actions";

export function CreateStudentForm({
  classes,
}: {
  classes: { id: number; class_name: string }[];
}) {
  const [result, formAction, isPending] = useActionState<
    CreateStudentResult | null,
    FormData
  >(createStudentAction, null);

  return (
    <SectionCard title="إضافة طالب جديد" contentClassName="space-y-4">
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="full_name">الاسم الكامل</Label>
            <Input id="full_name" name="full_name" autoComplete="name" required />
            <p className="text-xs text-muted-foreground">
              يُنشأ البريد الإلكتروني وكلمة السر تلقائيًا — لست بحاجة إلى إدخالهما
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="class_id">الصف</Label>
            <select
              id="class_id"
              name="class_id"
              required
              className={SELECT_CLASS}
            >
              <option value="">اختر الصف…</option>
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
              required
              className={SELECT_CLASS}
            >
              <option value="Arabic">عربي</option>
              <option value="Languages">لغات</option>
              <option value="Private">خاص</option>
            </select>
            <p className="text-xs text-muted-foreground">
              &quot;خاص&quot; = طالب حصص فردية — لن يُسجَّل تلقائيًا في مواد الفصل، وتضيف له المواد والجدول يدويًا
            </p>
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
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "جاري الإنشاء…" : "إنشاء الطالب"}
            </Button>
          </div>
        </form>

        <div aria-live="polite">
          {result && (
            <div
              className={`rounded-lg border p-4 text-sm ${
                result.ok
                  ? "border-green-300 bg-green-50 dark:bg-green-950"
                  : "border-destructive bg-destructive/10"
              }`}
            >
              <p className="font-medium">{result.message}</p>
              {result.credentials && (
                <div className="mt-2 space-y-1" dir="ltr">
                  <p>Email: {result.credentials.email}</p>
                  <p>
                    Password: <b>{result.credentials.password}</b>
                  </p>
                  <p>
                    Student Code: <b>{result.credentials.studentCode}</b>
                  </p>
                  <p dir="rtl" className="text-muted-foreground">
                    ⚠️ انسخ هذه البيانات الآن وسلّمها إلى الطالب، فلن تظهر مرة أخرى
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
    </SectionCard>
  );
}
