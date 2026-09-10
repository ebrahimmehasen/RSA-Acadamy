"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/shared/AuthCard";

function Verify2faForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "الكود غير صحيح");
      return;
    }
    router.replace(params.get("next") ?? "/");
    router.refresh();
  }

  return (
    <AuthCard
      title="التحقق بخطوتين"
      description="اكتب الكود من تطبيق المصادقة، أو أحد أكواد الاسترجاع"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="token">الكود</Label>
          <Input
            id="token"
            name="token"
            dir="ltr"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={token}
            onChange={(e) => setToken(e.target.value.trim())}
            className="h-12 text-center font-mono text-lg tracking-[0.3em]"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" aria-live="polite">
            {error}
          </p>
        )}
        <Button type="submit" size="touch" className="w-full" disabled={loading}>
          {loading ? "جاري التحقق…" : "تأكيد"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function Verify2faPage() {
  return (
    <Suspense>
      <Verify2faForm />
    </Suspense>
  );
}
