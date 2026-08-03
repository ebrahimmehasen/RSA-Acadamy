"use client";

import { useActionState, useState } from "react";
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

export function SignUpForm({
  classes,
}: {
  classes: { id: number; class_name: string }[];
}) {
  const [result, formAction, isPending] = useActionState<
    SignUpResult | null,
    FormData
  >(signUpAction, null);
  const [role, setRole] = useState("student");
  const phoneRequired = role === "parent" || role === "teacher";

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
          <form action={formAction} className="space-y-4" encType="multipart/form-data">
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
                value={role}
                onChange={(e) => setRole(e.target.value)}
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
              <Label htmlFor="phone">
                رقم الهاتف {phoneRequired ? "" : "(اختياري)"}
              </Label>
              <Input
                id="phone"
                name="phone"
                dir="ltr"
                required={phoneRequired}
              />
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

            {role === "student" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">تاريخ الميلاد (اختياري)</Label>
                  <Input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class_id">الصف الدراسي (اختياري)</Label>
                  <select
                    id="class_id"
                    name="class_id"
                    defaultValue=""
                    className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
                  >
                    <option value="">اختر لاحقًا مع الإدارة</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.class_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch">الشعبة (اختياري)</Label>
                  <select
                    id="branch"
                    name="branch"
                    defaultValue=""
                    className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
                  >
                    <option value="">—</option>
                    <option value="Arabic">عربي</option>
                    <option value="Languages">لغات</option>
                  </select>
                </div>
              </>
            )}

            {role === "parent" && (
              <div className="space-y-2">
                <Label htmlFor="address">العنوان (اختياري)</Label>
                <Input id="address" name="address" />
              </div>
            )}

            {role === "teacher" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="specialization">التخصص (اختياري)</Label>
                  <Input id="specialization" name="specialization" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cv">السيرة الذاتية (CV) — PDF أو Word</Label>
                  <Input
                    id="cv"
                    name="cv"
                    type="file"
                    accept="application/pdf,.doc,.docx"
                    required
                  />
                </div>
              </>
            )}

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
