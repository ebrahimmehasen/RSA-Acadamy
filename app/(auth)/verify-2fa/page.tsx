"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
      setError(body.error ?? "الكود غلط");
      return;
    }
    router.replace(params.get("next") ?? "/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm" dir="rtl">
      <CardHeader>
        <CardTitle>التحقق بخطوتين</CardTitle>
        <CardDescription>
          اكتب الكود من تطبيق المصادقة، أو أحد أكواد الاسترجاع
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">الكود</Label>
            <Input
              id="token"
              dir="ltr"
              inputMode="numeric"
              autoFocus
              value={token}
              onChange={(e) => setToken(e.target.value.trim())}
              className="text-center font-mono text-lg"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "جاري التحقق..." : "تأكيد"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function Verify2faPage() {
  return (
    <Suspense>
      <Verify2faForm />
    </Suspense>
  );
}
