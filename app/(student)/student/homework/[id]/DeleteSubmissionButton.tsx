"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteSubmission } from "./actions";

export function DeleteSubmissionButton({ assignmentId }: { assignmentId: number }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (
      !confirm(
        "هل أنت متأكد من حذف حلّك؟ سيتم حذف ملفاتك وإجابتك النصية، ويمكنك تسليم حل جديد بعد ذلك.",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await deleteSubmission(assignmentId);
      if (!res.ok) setError(res.message);
    });
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="gap-1.5"
        disabled={isPending}
        onClick={handleClick}
      >
        <Trash2 className="size-4" aria-hidden="true" />
        {isPending ? "جارٍ الحذف…" : "حذف حلّي"}
      </Button>
      {error && (
        <p className="text-sm text-destructive" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
