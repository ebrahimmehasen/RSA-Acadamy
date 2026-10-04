"use client";

import { useActionState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/shared/SectionCard";
import { useTicketedSubmit } from "@/lib/uploads/useTicketedSubmit";
import { updateTeacherCv, type UpdateTeacherCvResult } from "./actions";

/** Teacher-only: upload/replace the CV — mandatory, PDF only. */
export function TeacherCvCard({
  cvDriveId,
  cvUrl,
}: {
  cvDriveId: string | null;
  cvUrl: string | null;
}) {
  const [result, formAction, isPending] = useActionState<
    UpdateTeacherCvResult | null,
    FormData
  >(updateTeacherCv, null);
  const upload = useTicketedSubmit(formAction, [
    { name: "cv", kind: "teacher_cv", ticketName: "cv_ticket" },
  ]);

  return (
    <SectionCard
      title="السيرة الذاتية (CV)"
      description="ملف PDF فقط — مطلوب"
    >
      <form onSubmit={upload.onSubmit} className="space-y-3">
        {cvUrl && (
          <a
            href={cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-2 hover:underline"
          >
            <FileText className="size-4" aria-hidden="true" />
            عرض السيرة الذاتية الحالية
          </a>
        )}
        <div className="space-y-2">
          <Label htmlFor="cv">
            {cvDriveId ? "استبدال الملف" : "رفع السيرة الذاتية"}
          </Label>
          <Input
            id="cv"
            name="cv"
            type="file"
            accept="application/pdf,.pdf"
            required={!cvDriveId}
          />
        </div>
        {upload.uploadError && (
          <p className="text-sm text-destructive" aria-live="polite">
            {upload.uploadError}
          </p>
        )}
        {result && (
          <p
            className={`text-sm ${result.ok ? "text-green-600" : "text-destructive"}`}
            aria-live="polite"
          >
            {result.message}
          </p>
        )}
        <Button type="submit" disabled={isPending || upload.busy} variant="outline">
          {isPending || upload.busy ? "جاري الرفع…" : cvDriveId ? "استبدال الملف" : "رفع الملف"}
        </Button>
      </form>
    </SectionCard>
  );
}
