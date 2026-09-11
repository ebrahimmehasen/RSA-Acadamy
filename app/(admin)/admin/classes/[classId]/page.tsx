import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { type ScheduleSlot } from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { createSlot, deleteSlot, updateSlot } from "./actions";
import { AddSlotForm } from "./AddSlotForm";
import { EditSlotForm } from "./EditSlotForm";
import { ConfirmDeleteButton } from "@/components/shared/ConfirmDeleteButton";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { ScheduleGrid } from "@/components/shared/ScheduleGrid";
import { branchLabel } from "@/lib/subjects";

export default async function AdminClassSchedulePage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const id = Number(classId);
  if (!Number.isInteger(id)) notFound();

  const supabase = createAdminClient();

  const [
    { data: cls },
    { data: slots },
    { data: subjects },
    { data: teachers },
    { data: zoomAccounts },
    { data: privateStudents },
  ] = await Promise.all([
    supabase.from("classes").select("*").eq("id", id).single(),
    supabase
      .from("class_assignments")
      .select("*")
      .eq("class_id", id)
      .order("day_of_week")
      .order("start_time"),
    supabase
      .from("subjects")
      .select("subject_id, subject_name, branch")
      .eq("class_id", id)
      .eq("is_active", true)
      .order("branch")
      .order("subject_name"),
    supabase
      .from("teachers")
      .select("user_id, profiles!inner(full_name)")
      .eq("is_active", true),
    supabase.from("zoom_accounts").select("id, label").order("id"),
    supabase
      .from("students")
      .select("user_id, profiles!students_user_id_fkey(full_name)")
      .eq("class_id", id)
      .eq("branch", "Private"),
  ]);

  if (!cls) notFound();

  const studentOptions = (privateStudents ?? []).map((s) => ({
    id: s.user_id as number,
    name:
      (s.profiles as unknown as { full_name: string })?.full_name ??
      `طالب #${s.user_id}`,
  }));

  const teacherOptions = (teachers ?? []).map((t) => ({
    id: t.user_id as number,
    name:
      (t.profiles as unknown as { full_name: string })?.full_name ??
      `مدرس #${t.user_id}`,
  }));
  const teacherNameById = new Map(teacherOptions.map((t) => [t.id, t.name]));
  const subjectNameById = new Map(
    (subjects ?? []).map((s) => {
      const label = branchLabel(s.subject_name, s.branch);
      return [s.subject_id, label ? `${s.subject_name} ${label}` : s.subject_name];
    }),
  );

  const typedSlots = (slots ?? []) as ScheduleSlot[];
  const subjectOptions = (subjects ?? []).map((s) => ({
    id: s.subject_id,
    label: subjectNameById.get(s.subject_id) ?? s.subject_id,
  }));

  const studentNameById = new Map(studentOptions.map((s) => [s.id, s.name]));

  const gridEntries = typedSlots.map((slot) => ({
    id: slot.id,
    day: slot.day_of_week,
    start: slot.start_time,
    end: slot.end_time,
    subject: subjectNameById.get(slot.subject_id) ?? slot.subject_id,
    sub: (
      <>
        {slot.teacher_id ? (
          teacherNameById.get(slot.teacher_id) ?? "—"
        ) : (
          <span className="text-warning">غير محدد</span>
        )}
        {slot.student_id != null && (
          <span className="block text-info">
            خاص: {studentNameById.get(slot.student_id) ?? `طالب #${slot.student_id}`}
          </span>
        )}
      </>
    ),
    zoomLink: slot.zoom_link,
  }));

  const entryActions = Object.fromEntries(
    typedSlots.map((slot) => [
      slot.id,
      <div key={slot.id} className="flex flex-wrap gap-1">
        <EditSlotForm
          slot={slot}
          classId={id}
          subjects={subjectOptions}
          teachers={teacherOptions}
          zoomAccounts={zoomAccounts ?? []}
          students={studentOptions}
          action={updateSlot}
        />
        <ConfirmDeleteButton
          action={deleteSlot}
          hiddenFields={{ slot_id: slot.id, class_id: id }}
          confirmMessage="هل أنت متأكد من رغبتك في حذف هذه الحصة؟ هذا الإجراء نهائي ولا يمكن التراجع عنه."
        />
      </div>,
    ]),
  );

  return (
    <PageShell>
      <PageHeader
        title={cls.class_name}
        description="الجدول الأسبوعي وروابط Zoom"
        backHref="/admin/classes"
        backLabel="رجوع للفصول"
        action={
          <Button
            variant="outline"
            size="sm"
            render={
              <Link href={`/admin/classes/${id}/suggest`}>اقتراح توزيع 🪄</Link>
            }
          />
        }
      />

      <ScheduleGrid
        entries={gridEntries}
        entryActions={entryActions}
        caption="اضغط ✏️ لتعديل حصة أو 🗑️ لحذفها"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">إضافة حصة جديدة</CardTitle>
        </CardHeader>
        <CardContent>
          <AddSlotForm
            classId={id}
            subjects={subjectOptions}
            teachers={teacherOptions}
            zoomAccounts={zoomAccounts ?? []}
            students={studentOptions}
            action={createSlot}
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}
