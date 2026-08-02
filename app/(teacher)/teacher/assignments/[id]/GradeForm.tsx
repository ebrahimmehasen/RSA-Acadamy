"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { gradeSubmission } from "../actions";

export function GradeForm({
  submissionId,
  assignmentId,
  maxGrade,
  currentGrade,
  currentNotes,
}: {
  submissionId: number;
  assignmentId: number;
  maxGrade: number;
  currentGrade: number | null;
  currentNotes: string | null;
}) {
  const [open, setOpen] = useState(currentGrade === null);

  if (!open) {
    return (
      <Button variant="outline" size="xs" onClick={() => setOpen(true)}>
        تعديل الدرجة
      </Button>
    );
  }

  return (
    <form action={gradeSubmission} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="submission_id" value={submissionId} />
      <input type="hidden" name="assignment_id" value={assignmentId} />
      <div className="space-y-1">
        <label className="text-xs" htmlFor={`grade-${submissionId}`}>
          الدرجة (من {maxGrade})
        </label>
        <Input
          id={`grade-${submissionId}`}
          name="grade"
          type="number"
          min={0}
          max={maxGrade}
          defaultValue={currentGrade ?? undefined}
          required
          dir="ltr"
          className="w-24"
        />
      </div>
      <div className="min-w-40 flex-1 space-y-1">
        <label className="text-xs" htmlFor={`notes-${submissionId}`}>
          تعليق (اختياري)
        </label>
        <Textarea
          id={`notes-${submissionId}`}
          name="teacher_notes"
          defaultValue={currentNotes ?? ""}
          rows={1}
        />
      </div>
      <Button type="submit" size="sm">
        حفظ الدرجة
      </Button>
    </form>
  );
}
