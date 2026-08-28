"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
      {pending ? "جاري التسليم…" : "تسليم الاختبار"}
    </Button>
  );
}
