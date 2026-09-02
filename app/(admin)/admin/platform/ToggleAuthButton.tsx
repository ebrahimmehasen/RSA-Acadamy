"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function ToggleAuthButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={enabled ? "outline" : "default"} disabled={pending}>
      {pending
        ? "جاري الحفظ…"
        : enabled
          ? "إيقاف تسجيل الدخول والتسجيل"
          : "تفعيل تسجيل الدخول والتسجيل"}
    </Button>
  );
}
