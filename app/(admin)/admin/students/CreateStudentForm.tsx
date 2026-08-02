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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">إضافة طالب جديد</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="full_name">الاسم الكامل</Label>
            <Input id="full_name" name="full_name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" name="email" type="email" dir="ltr" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="class_id">الصف</Label>
            <select
              id="class_id"
              name="class_id"
              required
              className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
            >
              <option value="">اختر الصف...</option>
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
              className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
            >
              <option value="Arabic">عربي</option>
              <option value="Languages">لغات</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">الهاتف (اختياري)</Label>
            <Input id="phone" name="phone" dir="ltr" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "جاري الإنشاء..." : "إنشاء الطالب"}
            </Button>
          </div>
        </form>

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
                  ⚠️ انسخ البيانات دي دلوقتي وسلّمها للطالب — مش هتظهر تاني
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
