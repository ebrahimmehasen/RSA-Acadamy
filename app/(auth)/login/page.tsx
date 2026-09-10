"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/shared/AuthCard";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { AUTH_INPUT_CLASS } from "@/lib/ui";

const loginSchema = z.object({
  email: z.email("بريد إلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setServerError("بيانات الدخول غير صحيحة");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <AuthCard
      title="تسجيل الدخول"
      description="سجّل الدخول للمتابعة إلى حسابك"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <Input
            id="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            spellCheck={false}
            aria-invalid={!!errors.email}
            className={AUTH_INPUT_CLASS}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive" aria-live="polite">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">كلمة المرور</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              نسيت كلمة السر؟
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            className={AUTH_INPUT_CLASS}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-destructive" aria-live="polite">
              {errors.password.message}
            </p>
          )}
        </div>
        {serverError && (
          <p className="text-sm text-destructive" aria-live="polite">
            {serverError}
          </p>
        )}
        <Button
          type="submit"
          size="touch"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "جاري الدخول…" : "تسجيل الدخول"}
        </Button>
        <div className="space-y-2 text-center text-sm">
          <p className="text-muted-foreground">
            ليس لديك حساب؟{" "}
            <Link
              href="/signup"
              className="font-medium text-primary underline underline-offset-4"
            >
              إنشاء حساب جديد
            </Link>
          </p>
          <Link
            href="/"
            className="inline-block text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            → الرئيسية
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
