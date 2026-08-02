"use client";

import { useState } from "react";
import Image from "next/image";
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

type Step = "idle" | "setup" | "enabled";

export function TwoFactorSettings({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [step, setStep] = useState<Step>(initiallyEnabled ? "enabled" : "idle");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startSetup() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "حصل خطأ");
      return;
    }
    const data = await res.json();
    setQr(data.qr);
    setSecret(data.secret);
    setStep("setup");
  }

  async function confirmEnable() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/2fa/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "الكود غلط");
      return;
    }
    const data = await res.json();
    setBackupCodes(data.backupCodes);
    setStep("enabled");
  }

  async function disable() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "الكود غلط");
      return;
    }
    setStep("idle");
    setToken("");
    setBackupCodes(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">التحقق بخطوتين (2FA)</CardTitle>
        <CardDescription>
          حماية إضافية لحسابك عن طريق تطبيق مصادقة زي Google Authenticator
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "idle" && (
          <Button onClick={startSetup} disabled={loading}>
            {loading ? "جاري التجهيز..." : "تفعيل 2FA"}
          </Button>
        )}

        {step === "setup" && qr && (
          <div className="space-y-4">
            <p className="text-sm">امسح الكود ده بتطبيق المصادقة:</p>
            <Image src={qr} alt="QR" width={200} height={200} unoptimized />
            {secret && (
              <p className="text-xs text-muted-foreground" dir="ltr">
                أو أدخل الكود يدويًا: {secret}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="setup_token">اكتب الكود من التطبيق للتأكيد</Label>
              <Input
                id="setup_token"
                dir="ltr"
                inputMode="numeric"
                value={token}
                onChange={(e) => setToken(e.target.value.trim())}
                className="w-40 text-center font-mono"
              />
            </div>
            <Button onClick={confirmEnable} disabled={loading || token.length !== 6}>
              {loading ? "جاري التأكيد..." : "تأكيد وتفعيل"}
            </Button>
          </div>
        )}

        {step === "enabled" && (
          <div className="space-y-4">
            {backupCodes ? (
              <div className="space-y-2 rounded-lg border border-green-300 bg-green-50 p-4 dark:bg-green-950">
                <p className="font-medium">
                  2FA اتفعّل ✅ — احفظ أكواد الاسترجاع دي في مكان آمن (كل كود يُستخدم مرة واحدة):
                </p>
                <div className="grid grid-cols-2 gap-1 font-mono text-sm" dir="ltr">
                  {backupCodes.map((code) => (
                    <span key={code}>{code}</span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-green-600">2FA مفعّل على حسابك ✅</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="disable_token">
                اكتب كود حالي من التطبيق عشان تلغي التفعيل
              </Label>
              <Input
                id="disable_token"
                dir="ltr"
                inputMode="numeric"
                value={token}
                onChange={(e) => setToken(e.target.value.trim())}
                className="w-40 text-center font-mono"
              />
            </div>
            <Button
              variant="destructive"
              onClick={disable}
              disabled={loading || token.length !== 6}
            >
              {loading ? "جاري الإلغاء..." : "إلغاء تفعيل 2FA"}
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
