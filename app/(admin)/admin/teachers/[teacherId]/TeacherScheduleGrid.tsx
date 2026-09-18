"use client";

import { useState, type ComponentProps } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScheduleGrid } from "@/components/shared/ScheduleGrid";
import { DAY_LABELS, PERIODS, periodValue, type DayOfWeek } from "@/lib/schedule";
import { TeacherAddSlotForm } from "./TeacherAddSlotForm";

type AddFormProps = ComponentProps<typeof TeacherAddSlotForm>;

/**
 * The teacher's schedule grid with a "+" in every empty cell: clicking it
 * opens the add-slot form with this teacher, day and period already
 * chosen, so filling the timetable is one click + a subject.
 */
export function TeacherScheduleGrid({
  entries,
  entryActions,
  teacherId,
  classes,
  subjectsByClass,
  studentsByClass,
  zoomAccounts,
  action,
}: {
  entries: ComponentProps<typeof ScheduleGrid>["entries"];
  entryActions: ComponentProps<typeof ScheduleGrid>["entryActions"];
  teacherId: AddFormProps["teacherId"];
  classes: AddFormProps["classes"];
  subjectsByClass: AddFormProps["subjectsByClass"];
  studentsByClass: AddFormProps["studentsByClass"];
  zoomAccounts: AddFormProps["zoomAccounts"];
  action: AddFormProps["action"];
}) {
  const [target, setTarget] = useState<{ day: DayOfWeek; period: string } | null>(
    null,
  );
  const targetPeriod = target
    ? PERIODS.find((p) => periodValue(p) === target.period)
    : null;

  return (
    <>
      <ScheduleGrid
        entries={entries}
        entryActions={entryActions}
        renderEmptyCell={(day, periodStart) => {
          const period = PERIODS.find((p) => p.start === periodStart);
          if (!period) return null;
          return (
            <button
              type="button"
              onClick={() => setTarget({ day, period: periodValue(period) })}
              aria-label={`إضافة حصة — ${DAY_LABELS[day]} ${period.label}`}
              className="flex h-full min-h-14 w-full items-center justify-center rounded-md text-muted-foreground/50 outline-none transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          );
        }}
      />
      <Dialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              إضافة حصة —{" "}
              {target ? `${DAY_LABELS[target.day]} · ${targetPeriod?.label ?? ""}` : ""}
            </DialogTitle>
          </DialogHeader>
          {target && (
            <TeacherAddSlotForm
              key={`${target.day}|${target.period}`}
              teacherId={teacherId}
              classes={classes}
              subjectsByClass={subjectsByClass}
              studentsByClass={studentsByClass}
              zoomAccounts={zoomAccounts}
              action={action}
              defaultDay={target.day}
              defaultPeriod={target.period}
              onDone={() => setTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
