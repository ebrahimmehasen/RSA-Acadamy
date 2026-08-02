"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ChangePasswordForm({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (next.length < 8) {
      setMessage({ ok: false, text: "كلمة السر الجديدة لازم تكون 8 حروف على الأقل" });
      return;
    }
    if (next !== confirm) {
      setMessage({ ok: false, text: "كلمتا السر الجديدتين مش متطابقتين" });
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // re-authenticate with the current password before allowing the change
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (signInError) {
      setLoading(false);
      setMessage({ ok: false, text: "كلمة السر الحالية غلط" });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: next });
    setLoading(false);
    if (error) {
      setMessage({ ok: false, text: "حصل خطأ — حاول تاني" });
      return;
    }

    setCurrent("");
    setNext("");
    setConfirm("");
    setMessage({ ok: true, text: "تم تغيير كلمة السر ✅" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">تغيير كلمة السر</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current_password">كلمة السر الحالية</Label>
            <Input
              id="current_password"
              type="password"
              dir="ltr"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_password">كلمة السر الجديدة</Label>
            <Input
              id="new_password"
              type="password"
              dir="ltr"
              required
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">تأكيد كلمة السر الجديدة</Label>
            <Input
              id="confirm_password"
              type="password"
              dir="ltr"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {message && (
            <p
              className={`text-sm ${message.ok ? "text-green-600" : "text-destructive"}`}
            >
              {message.text}
            </p>
          )}
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "جاري الحفظ..." : "حفظ كلمة السر الجديدة"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
