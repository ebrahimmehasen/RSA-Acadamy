import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DAYS,
  DAY_LABELS,
  PERIODS,
  formatTime,
  periodValue,
  type DayOfWeek,
  type ScheduleSlot,
} from "@/lib/schedule";
import { branchLabel } from "@/lib/subjects";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { CalendarX } from "lucide-react";
import { ConfirmDeleteButton } from "@/components/shared/ConfirmDeleteButton";
import { createSlot, deleteSlot, updateSlot } from "../classes/[classId]/actions";
import { EditSlotForm } from "../classes/[classId]/EditSlotForm";
import { QuickAddSlotButton } from "./QuickAddSlotButton";

const hhmm = (t: string) => t.slice(0, 5);

function isValidDay(value: string | undefined): value is DayOfWeek {
  return !!value && (DAYS as readonly string[]).includes(value);
}

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { day: rawDay } = await searchParams;
  const todayCairo = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    weekday: "long",
  })
    .format(new Date())
    .toLowerCase();
  const day: DayOfWeek = isValidDay(rawDay) ? rawDay : (todayCairo as DayOfWeek);

  const supabase = createAdminClient();

  const [
    { data: classes },
    { data: slots },
    { data: subjects },
    { data: teachers },
    { data: zoomAccounts },
    { data: privateStudents },
  ] = await Promise.all([
    supabase.from("classes").select("id, class_name").order("id"),
    supabase
      .from("class_assignments")
      .select("*")
      .eq("day_of_week", day)
      .order("start_time"),
    supabase
      .from("subjects")
      .select("subject_id, subject_name, branch, class_id")
      .eq("is_active", true)
      .order("subject_name"),
    supabase
      .from("teachers")
      .select("user_id, profiles!inner(full_name)")
      .eq("is_active", true),
    supabase.from("zoom_accounts").select("id, label").order("id"),
    supabase
      .from("students")
      .select("user_id, class_id, profiles!students_user_id_fkey(full_name)")
      .eq("branch", "Private"),
  ]);

  const studentNameById = new Map(
    (privateStudents ?? []).map((s) => [
      s.user_id as number,
      (s.profiles as unknown as { full_name: string })?.full_name ?? `طالب #${s.user_id}`,
    ]),
  );
  const studentsByClass: Record<number, { id: number; name: string }[]> = {};
  for (const s of privateStudents ?? []) {
    if (s.class_id == null) continue;
    (studentsByClass[s.class_id] ??= []).push({
      id: s.user_id as number,
      name: studentNameById.get(s.user_id as number)!,
    });
  }

  const teacherOptions = (teachers ?? []).map((t) => ({
    id: t.user_id as number,
    name:
      (t.profiles as unknown as { full_name: string })?.full_name ??
      `مدرس #${t.user_id}`,
  }));
  const teacherNameById = new Map(teacherOptions.map((t) => [t.id, t.name]));

  const subjectNameById = new Map<string, string>();
  const subjectsByClass: Record<number, { id: string; label: string }[]> = {};
  for (const s of subjects ?? []) {
    const suffix = branchLabel(s.subject_name, s.branch);
    const label = suffix ? `${s.subject_name} ${suffix}` : s.subject_name;
    subjectNameById.set(s.subject_id, label);
    (subjectsByClass[s.class_id] ??= []).push({ id: s.subject_id, label });
  }

  const typedSlots = (slots ?? []) as ScheduleSlot[];
  const periodStarts = new Set<string>(PERIODS.map((p) => p.start));
  const slotsByClassPeriod = new Map<string, ScheduleSlot[]>();
  const extrasByClass = new Map<number, ScheduleSlot[]>();
  for (const slot of typedSlots) {
    const start = hhmm(slot.start_time);
    if (periodStarts.has(start)) {
      const key = `${slot.class_id}_${start}`;
      if (!slotsByClassPeriod.has(key)) slotsByClassPeriod.set(key, []);
      slotsByClassPeriod.get(key)!.push(slot);
    } else {
      if (!extrasByClass.has(slot.class_id)) extrasByClass.set(slot.class_id, []);
      extrasByClass.get(slot.class_id)!.push(slot);
    }
  }

  const classList = classes ?? [];

  function SlotCard({ slot, classId }: { slot: ScheduleSlot; classId: number }) {
    return (
      <div className="space-y-1 rounded-md bg-muted/50 p-1.5 text-xs">
        <p className="leading-tight font-semibold">
          {subjectNameById.get(slot.subject_id) ?? slot.subject_id}
        </p>
        <p className="text-muted-foreground">
          {slot.teacher_id ? (
            (teacherNameById.get(slot.teacher_id) ?? "—")
          ) : (
            <span className="text-warning">غير محدد</span>
          )}
        </p>
        {slot.student_id != null && (
          <p className="font-medium text-info">
            خاص: {studentNameById.get(slot.student_id) ?? `طالب #${slot.student_id}`}
          </p>
        )}
        <div className="flex flex-wrap gap-1">
          <EditSlotForm
            slot={slot}
            classId={classId}
            subjects={subjectsByClass[classId] ?? []}
            teachers={teacherOptions}
            zoomAccounts={zoomAccounts ?? []}
            students={studentsByClass[classId] ?? []}
            action={updateSlot}
          />
          <ConfirmDeleteButton
            action={deleteSlot}
            hiddenFields={{ slot_id: slot.id, class_id: classId }}
            confirmMessage="هل أنت متأكد من رغبتك في حذف هذه الحصة؟ هذا الإجراء نهائي ولا يمكن التراجع عنه."
          />
        </div>
      </div>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="الجدول الشامل"
        description="كل الفصول والمعلمين في جدول واحد — اضغط على أي خانة لتعديلها أو إضافة حصة جديدة"
      />

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="اختر اليوم">
        {DAYS.map((d) => (
          <Link
            key={d}
            href={`/admin/schedule?day=${d}`}
            role="tab"
            aria-selected={d === day}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              d === day
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            {DAY_LABELS[d]}
            {d === todayCairo && (
              <span className="mr-1 text-xs opacity-75">(اليوم)</span>
            )}
          </Link>
        ))}
      </div>

      {classList.length === 0 ? (
        <EmptyState icon={CalendarX} title="لا توجد فصول بعد" />
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="sticky start-0 z-10 border bg-muted/60 p-2 text-start text-xs font-semibold whitespace-nowrap text-muted-foreground">
                    الفصل
                  </th>
                  {PERIODS.map((p) => (
                    <th
                      key={p.start}
                      className="border bg-muted/60 p-2 text-center align-top whitespace-nowrap"
                    >
                      <span className="block font-semibold">{p.label}</span>
                      <span
                        className="mt-0.5 block text-xs font-normal text-muted-foreground"
                        dir="ltr"
                      >
                        {formatTime(p.start)}–{formatTime(p.end)}
                      </span>
                    </th>
                  ))}
                  <th className="border bg-muted/60 p-2 text-center text-xs font-semibold whitespace-nowrap text-muted-foreground">
                    مواعيد خاصة
                  </th>
                </tr>
              </thead>
              <tbody>
                {classList.map((cls) => {
                  const extras = extrasByClass.get(cls.id) ?? [];
                  return (
                    <tr key={cls.id}>
                      <th
                        scope="row"
                        className="sticky start-0 z-10 border bg-muted/40 p-2 text-start align-top font-medium whitespace-nowrap"
                      >
                        <Link
                          href={`/admin/classes/${cls.id}`}
                          className="outline-none hover:underline focus-visible:underline"
                        >
                          {cls.class_name}
                        </Link>
                      </th>
                      {PERIODS.map((p) => {
                        const key = `${cls.id}_${p.start}`;
                        const cellSlots = slotsByClassPeriod.get(key) ?? [];
                        return (
                          <td
                            key={p.start}
                            className={cn(
                              "min-w-[9rem] border p-1.5 align-top",
                              cellSlots.length === 0 && "text-center",
                            )}
                          >
                            {cellSlots.length === 0 ? (
                              <QuickAddSlotButton
                                classId={cls.id}
                                className={cls.class_name}
                                day={day}
                                period={periodValue(p)}
                                subjects={subjectsByClass[cls.id] ?? []}
                                teachers={teacherOptions}
                                zoomAccounts={zoomAccounts ?? []}
                                students={studentsByClass[cls.id] ?? []}
                                action={createSlot}
                              />
                            ) : (
                              <div className="space-y-1.5">
                                {cellSlots.map((slot) => (
                                  <SlotCard key={slot.id} slot={slot} classId={cls.id} />
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="min-w-[9rem] border p-1.5 align-top">
                        {extras.length === 0 ? (
                          <span className="block text-center text-muted-foreground/40">
                            —
                          </span>
                        ) : (
                          <div className="space-y-1.5">
                            {extras.map((slot) => (
                              <div key={slot.id} className="space-y-1">
                                <p dir="ltr" className="text-xs text-muted-foreground">
                                  {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
                                </p>
                                <SlotCard slot={slot} classId={cls.id} />
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  );
}
