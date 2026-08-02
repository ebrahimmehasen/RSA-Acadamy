"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError("حصل خطأ — تأكد من البريد الإلكتروني");
      return;
    }
    setSent(true);
  }

  return (
    <Card className="w-full max-w-sm" dir="rtl">
      <CardHeader>
        <CardTitle>نسيت كلمة السر؟</CardTitle>
        <CardDescription>
          هنبعتلك رابط لإعادة تعيين كلمة السر على بريدك الإلكتروني
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="space-y-3 text-sm">
            <p className="text-green-600">
              لو الإيميل ده مسجّل عندنا، هيوصلك رابط إعادة التعيين ✅
            </p>
            <Link href="/login" className="text-primary underline underline-offset-4">
              الرجوع لتسجيل الدخول
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                dir="ltr"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}
            </Button>
            <Link
              href="/login"
              className="block text-center text-sm text-muted-foreground underline underline-offset-4"
            >
              الرجوع لتسجيل الدخول
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
