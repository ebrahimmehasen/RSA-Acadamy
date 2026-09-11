"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateAssignmentForm } from "./CreateAssignmentForm";

/**
 * Keeps the create-assignment flow collapsed behind a big button by
 * default, so the existing assignments list stays the first thing a
 * teacher sees. Opening reveals the exact same CreateAssignmentForm —
 * nothing about its behavior changes, only when it's shown.
 */
export function CreateAssignmentToggle({
  slots,
}: {
  slots: { classId: number; className: string; subjectId: string; subjectName: string }[];
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="h-auto w-full justify-center gap-2 rounded-xl py-4 text-base"
      >
        <Plus className="size-5" aria-hidden="true" />
        إضافة واجب جديد
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen(false)}
          className="gap-1.5 text-muted-foreground"
        >
          <X className="size-4" aria-hidden="true" />
          إغلاق
        </Button>
      </div>
      <CreateAssignmentForm slots={slots} />
    </div>
  );
}
