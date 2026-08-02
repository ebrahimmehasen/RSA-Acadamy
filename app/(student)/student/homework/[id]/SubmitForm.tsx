"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitAssignment, type SubmitResult } from "./actions";

export function SubmitForm({
  assignmentId,
  allowFile,
  allowText,
}: {
  assignmentId: number;
  allowFile: boolean;
  allowText: boolean;
}) {
  const [result, formAction, isPending] = useActionState<
    SubmitResult | null,
    FormData
  >(submitAssignment, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="assignment_id" value={assignmentId} />

      {allowFile && (
        <div className="space-y-2">
          <Label htmlFor="file">ملف الإجابة (حد أقصى 25MB)</Label>
          <Input
            id="file"
            name="file"
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.pdf,.docx,.txt,.zip"
          />
        </div>
      )}

      {allowText && (
        <div className="space-y-2">
          <Label htmlFor="text_answer">إجابة نصية</Label>
          <Textarea
            id="text_answer"
            name="text_answer"
            rows={6}
            placeholder="اكتب إجابتك هنا..."
          />
        </div>
      )}

      {result && (
        <p
          className={`text-sm ${result.ok ? "text-green-600" : "text-destructive"}`}
        >
          {result.message}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "جاري التسليم..." : "تسليم الواجب"}
      </Button>
    </form>
  );
}
