"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError("انتهت صلاحية الرابط — اطلب رابط جديد من صفحة نسيت كلمة السر");
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
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "جاري الحفظ..." : "حفظ كلمة السر"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
