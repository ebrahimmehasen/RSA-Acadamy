"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
      setError("كلمة السر لازم تكون 8 حروف على الأقل");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا السر مش متطابقتين");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      if (error.code === "same_password") {
        setError("كلمة السر الجديدة لازم تكون مختلفة عن كلمة السر الحالية");
      } else {
        setError(EXPIRED_LINK_ERROR);
      }
      return;
    }
    router.replace("/login");
  }

  return (
    <Card className="w-full max-w-sm" dir="rtl">
      <CardHeader>
        <CardTitle>تعيين كلمة سر جديدة</CardTitle>
        <CardDescription>اكتب كلمة السر الجديدة بتاعتك</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">كلمة السر الجديدة</Label>
            <Input
              id="password"
              type="password"
              dir="ltr"
              required
              disabled={!ready}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">تأكيد كلمة السر</Label>
            <Input
              id="confirm"
              type="password"
              dir="ltr"
              required
              disabled={!ready}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || !ready}>
            {loading ? "جاري الحفظ..." : "حفظ كلمة السر"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
