import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { type ScheduleSlot, filterSlotsForStudentBranch } from "@/lib/schedule";
import { CalendarX } from "lucide-react";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ScheduleGrid } from "@/components/shared/ScheduleGrid";

export default async function StudentSchedulePage() {
  const session = await getSession();
  const supabase = await createClient();

  // RLS scopes rows to the student's own class
  const { data: slots } = await supabase
    .from("class_assignments")
    .select("*, subjects(subject_name, branch)")
    .eq("is_active", true)
    .order("start_time");

  const { data: student } = await supabase
    .from("students")
    .select("class_id, branch")
    .eq("user_id", session!.profile.id)
    .single();

  const { data: enrolled } = await supabase
    .from("student_subjects")
    .select("subject_id")
    .eq("student_id", session!.profile.id)
    .eq("is_active", true);
  const enrolledSubjectIds = new Set((enrolled ?? []).map((e) => e.subject_id));

  const allSlots = (slots ?? []) as (ScheduleSlot & {
    subjects: { subject_name: string; branch: string } | null;
  })[];
  const typedSlots = filterSlotsForStudentBranch(
    allSlots,
    student?.branch ?? null,
    enrolledSubjectIds,
  );

  if (!student?.class_id) {
    return (
      <PageShell>
        <PageHeader title="الجدول الدراسي" />
        <EmptyState
          icon={CalendarX}
          title="لم يتم تسجيلك في أي فصل بعد"
          description="يُرجى التواصل مع الإدارة."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader title="الجدول الدراسي" />
      {typedSlots.length === 0 ? (
        <EmptyState icon={CalendarX} title="لا توجد حصص في الجدول حتى الآن." />
      ) : (
        <ScheduleGrid
          zoomLabel="دخول الحصة"
          entries={typedSlots.map((slot) => ({
            id: slot.id,
            day: slot.day_of_week,
            start: slot.start_time,
            end: slot.end_time,
            subject: slot.subjects?.subject_name ?? slot.subject_id,
            zoomLink: slot.zoom_link,
            zoomPasscode: slot.zoom_passcode,
          }))}
        />
      )}
    </PageShell>
  );
}
