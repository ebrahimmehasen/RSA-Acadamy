"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/shared/AuthCard";
import { AUTH_INPUT_CLASS } from "@/lib/ui";

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
      setError("حدث خطأ — يرجى التأكد من البريد الإلكتروني");
      return;
    }
    setSent(true);
  }

  return (
    <AuthCard
      title="نسيت كلمة السر؟"
      description="سنرسل إليك رابطًا لإعادة تعيين كلمة السر على بريدك الإلكتروني"
    >
      {sent ? (
        <div className="space-y-3 text-sm" aria-live="polite">
          <p className="text-success">
            إذا كان هذا البريد الإلكتروني مسجلاً لدينا، فسيصلك رابط إعادة التعيين ✅
          </p>
          <Link
            href="/login"
            className="inline-block font-medium text-primary underline underline-offset-4"
          >
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
              autoComplete="email"
              spellCheck={false}
              required
              className={AUTH_INPUT_CLASS}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" aria-live="polite">
              {error}
            </p>
          )}
          <Button type="submit" size="touch" className="w-full" disabled={loading}>
            {loading ? "جاري الإرسال…" : "إرسال رابط إعادة التعيين"}
          </Button>
          <Link
            href="/login"
            className="block text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            الرجوع لتسجيل الدخول
          </Link>
        </form>
      )}
    </AuthCard>
  );
}
