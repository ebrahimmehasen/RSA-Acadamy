"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/shared/AuthCard";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { AUTH_INPUT_CLASS } from "@/lib/ui";

const EXPIRED_LINK_ERROR =
  "انتهت صلاحية الرابط — اطلب رابط جديد من صفحة نسيت كلمة السر";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    !tokenHash && !code ? EXPIRED_LINK_ERROR : null,
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tokenHash && !code) return;
    const supabase = createClient();

    if (tokenHash) {
      // Doesn't need a code_verifier from the requesting browser, so it
      // works when the link is opened on a different device/browser —
      // the normal case for an email link.
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: "recovery" })
        .then(({ error }) => {
          if (error) {
            setError(EXPIRED_LINK_ERROR);
            return;
          }
          setReady(true);
        });
      return;
    }

    // Only works if opened in the same browser that requested the
    // reset (needs the local code_verifier). Kept as a fallback for
    // the default Supabase ConfirmationURL format.
    supabase.auth.exchangeCodeForSession(code!).then(({ error }) => {
      if (error) {
        setError(EXPIRED_LINK_ERROR);
        return;
      }
      setReady(true);
    });
  }, [tokenHash, code]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("يجب أن تتكون كلمة السر من 8 أحرف على الأقل");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا السر غير متطابقتين");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      if (error.code === "same_password") {
        setError("يجب أن تكون كلمة السر الجديدة مختلفة عن كلمة السر الحالية");
      } else {
        setError(EXPIRED_LINK_ERROR);
      }
      return;
    }
    router.replace("/login");
  }

  return (
    <AuthCard
      title="تعيين كلمة سر جديدة"
      description="اكتب كلمة السر الجديدة الخاصة بك"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">كلمة السر الجديدة</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            disabled={!ready}
            className={AUTH_INPUT_CLASS}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">تأكيد كلمة السر</Label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            required
            disabled={!ready}
            className={AUTH_INPUT_CLASS}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" aria-live="polite">
            {error}
          </p>
        )}
        <Button
          type="submit"
          size="touch"
          className="w-full"
          disabled={loading || !ready}
        >
          {loading ? "جاري الحفظ…" : "حفظ كلمة السر"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
