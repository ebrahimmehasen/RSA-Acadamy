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
  createTeacherAction,
  type CreateTeacherResult,
} from "./actions";

export function CreateTeacherForm() {
  const [result, formAction, isPending] = useActionState<
    CreateTeacherResult | null,
    FormData
  >(createTeacherAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">إضافة مدرس جديد</CardTitle>
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
            <Label htmlFor="specialization">التخصص (اختياري)</Label>
            <Input id="specialization" name="specialization" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">الهاتف</Label>
            <Input id="phone" name="phone" dir="ltr" required />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "جاري الإنشاء..." : "إنشاء المدرس"}
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
                <p dir="rtl" className="text-muted-foreground">
                  ⚠️ انسخ البيانات دي دلوقتي وسلّمها للمدرس — مش هتظهر تاني
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
