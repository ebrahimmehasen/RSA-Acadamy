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
  mode = "create",
  defaultText = "",
  hasExistingFile = false,
}: {
  assignmentId: number;
  allowFile: boolean;
  allowText: boolean;
  /** "update" edits the student's existing (not yet graded) submission */
  mode?: "create" | "update";
  defaultText?: string;
  hasExistingFile?: boolean;
}) {
  const [result, formAction, isPending] = useActionState<
    SubmitResult | null,
    FormData
  >(submitAssignment, null);
  const editing = mode === "update";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="assignment_id" defaultValue={assignmentId} />
      <input type="hidden" name="intent" value={mode} />

      {allowFile && (
        <div className="space-y-2">
          <Label htmlFor="file">
            {editing && hasExistingFile
              ? "استبدال الملف (اتركه فارغًا للاحتفاظ بالملف الحالي)"
              : "ملف الإجابة (حد أقصى 25MB)"}
          </Label>
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
            defaultValue={defaultText}
            placeholder="اكتب إجابتك هنا…"
          />
        </div>
      )}

      {result && (
        <p
          aria-live="polite"
          className={`text-sm ${result.ok ? "text-green-600" : "text-destructive"}`}
        >
          {result.message}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending
          ? editing
            ? "جاري الحفظ…"
            : "جاري التسليم…"
          : editing
            ? "حفظ التعديل"
            : "تسليم الواجب"}
      </Button>
    </form>
  );
}
