"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { DayOfWeek } from "@/lib/schedule";
import { AddSlotForm } from "../classes/[classId]/AddSlotForm";

export function QuickAddSlotButton({
  classId,
  className,
  day,
  period,
  subjects,
  teachers,
  zoomAccounts,
  action,
}: {
  classId: number;
  className: string;
  day: DayOfWeek;
  period: string;
  subjects: { id: string; label: string }[];
  teachers: { id: number; name: string }[];
  zoomAccounts: { id: number; label: string }[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  async function addAndClose(formData: FormData) {
    await action(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={`إضافة حصة — ${className}`}
            className="flex h-full min-h-14 w-full items-center justify-center rounded-md text-muted-foreground/50 outline-none transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        }
      >
        <Plus className="size-4" aria-hidden="true" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>إضافة حصة — {className}</DialogTitle>
        </DialogHeader>
        <AddSlotForm
          classId={classId}
          subjects={subjects}
          teachers={teachers}
          zoomAccounts={zoomAccounts}
          action={addAndClose}
          defaultDay={day}
          defaultPeriod={period}
        />
      </DialogContent>
    </Dialog>
  );
}
