import { createClient } from "@/lib/supabase/server";
import { type ScheduleSlot } from "@/lib/schedule";
import { CalendarX } from "lucide-react";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ScheduleGrid } from "@/components/shared/ScheduleGrid";
import { TeacherZoomForm } from "./TeacherZoomForm";

export default async function TeacherClassesPage() {
  const supabase = await createClient();

  // RLS scopes rows to the teacher's own slots
  const { data: slots } = await supabase
    .from("class_assignments")
    .select("*, subjects(subject_name), classes(class_name)")
    .eq("is_active", true)
    .order("start_time");

  const typedSlots = (slots ?? []) as (ScheduleSlot & {
    subjects: { subject_name: string } | null;
    classes: { class_name: string } | null;
  })[];

  const entryActions = Object.fromEntries(
    typedSlots.map((slot) => [
      slot.id,
      <TeacherZoomForm
        key={slot.id}
        slotId={slot.id}
        zoomLink={slot.zoom_link}
        zoomMeetingId={slot.zoom_meeting_id}
        zoomPasscode={slot.zoom_passcode}
      />,
    ]),
  );

  return (
    <PageShell>
      <PageHeader
        title="فصولك وجدولك الأسبوعي"
        description="اضغط «إضافة رابط» جنب أي حصة لضبط رابط Zoom الخاص بها"
      />
      {typedSlots.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title="لا توجد حصص بعد"
          description="لم تُوزِّع الإدارة عليك حصصًا في الجدول بعد."
        />
      ) : (
        <ScheduleGrid
          zoomLabel="بدء الحصة"
          entryActions={entryActions}
          entries={typedSlots.map((slot) => ({
            id: slot.id,
            day: slot.day_of_week,
            start: slot.start_time,
            end: slot.end_time,
            subject: slot.subjects?.subject_name ?? slot.subject_id,
            sub: slot.classes?.class_name,
            zoomLink: slot.zoom_link,
            zoomPasscode: slot.zoom_passcode,
          }))}
        />
      )}
    </PageShell>
  );
}
