"use client";

import { useActionState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/shared/SectionCard";
import { updateTeacherCv, type UpdateTeacherCvResult } from "./actions";

/** Teacher-only: upload/replace the CV — mandatory, PDF only. */
export function TeacherCvCard({ cvDriveId }: { cvDriveId: string | null }) {
  const [result, formAction, isPending] = useActionState<
    UpdateTeacherCvResult | null,
    FormData
  >(updateTeacherCv, null);

  return (
    <SectionCard
      title="السيرة الذاتية (CV)"
      description="ملف PDF فقط — مطلوب"
    >
      <form action={formAction} className="space-y-3" encType="multipart/form-data">
        {cvDriveId && (
          <a
            href={`/api/files/${cvDriveId}`}
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
        {result && (
          <p
            className={`text-sm ${result.ok ? "text-green-600" : "text-destructive"}`}
            aria-live="polite"
          >
            {result.message}
          </p>
        )}
        <Button type="submit" disabled={isPending} variant="outline">
          {isPending ? "جاري الرفع…" : cvDriveId ? "استبدال الملف" : "رفع الملف"}
        </Button>
      </form>
    </SectionCard>
  );
}
