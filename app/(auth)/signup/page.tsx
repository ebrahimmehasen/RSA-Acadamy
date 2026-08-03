"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signUpAction, type SignUpResult } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  student: "طالب",
  teacher: "مدرس",
  parent: "ولي أمر",
};

export default function SignUpPage() {
  const [result, formAction, isPending] = useActionState<
    SignUpResult | null,
    FormData
  >(signUpAction, null);

  return (
    <Card className="w-full max-w-sm" dir="rtl">
      <CardHeader>
        <CardTitle>إنشاء حساب جديد</CardTitle>
        <CardDescription>
          حسابك هيفضل مقفول لحد ما إدارة RSA Academy تفعّله
        </CardDescription>
      </CardHeader>
      <CardContent>
        {result?.ok ? (
          <div className="space-y-3 text-sm">
            <p className="text-green-600">{result.message}</p>
            <Link
              href="/login"
              className="text-primary underline underline-offset-4"
            >
              تسجيل الدخول
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">الاسم الكامل</Label>
              <Input id="full_name" name="full_name" required minLength={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">نوع الحساب</Label>
              <select
                id="role"
                name="role"
                required
                defaultValue="student"
                className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" name="email" type="email" dir="ltr" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">الهاتف (اختياري)</Label>
              <Input id="phone" name="phone" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة السر</Label>
              <Input
                id="password"
                name="password"
                type="password"
                dir="ltr"
                required
                minLength={8}
              />
            </div>
            {result && !result.ok && (
              <p className="text-sm text-destructive">{result.message}</p>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "جاري الإنشاء..." : "إنشاء الحساب"}
            </Button>
            <Link
              href="/login"
              className="block text-center text-sm text-muted-foreground underline underline-offset-4"
            >
              عندك حساب بالفعل؟ سجّل الدخول
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
