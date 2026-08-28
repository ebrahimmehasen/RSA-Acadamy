"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function PublishButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "جاري النشر…" : "نشر الاختبار"}
    </Button>
  );
}
