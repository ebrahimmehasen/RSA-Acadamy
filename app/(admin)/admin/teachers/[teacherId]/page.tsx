import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAYS, DAY_LABELS, formatTime } from "@/lib/schedule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, ClipboardList, FileQuestion } from "lucide-react";
import { updateTeacherSubjects } from "../actions";
import { EditTeacherForm } from "./EditTeacherForm";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { StatGrid } from "@/components/shared/StatGrid";
import { StatCard } from "@/components/shared/StatCard";
import { AdminEditLogCard } from "@/components/shared/AdminEditLogCard";
import { branchLabel } from "@/lib/subjects";

export default async function AdminTeacherDetailPage({
  params,
}: {
  params: Promise<{ teacherId: string }>;
}) {
  const { teacherId: teacherIdParam } = await params;
  const teacherId = Number(teacherIdParam);
  if (!Number.isInteger(teacherId) || teacherId <= 0) notFound();

  const supabase = createAdminClient();

  const [
    { data: teacher },
    { data: prefs },
    { data: subjects },
    { data: schedule },
    { data: availability },
    { data: assignments },
    { data: quizzes },
  ] = await Promise.all([
    supabase
      .from("teachers")
      .select(
        "user_id, specialization, qualification, is_active, cv_drive_id, profiles!teachers_user_id_fkey(full_name, phone, user_id)",
      )
      .eq("user_id", teacherId)
      .maybeSingle(),
    supabase
      .from("teacher_preferences")
      .select("subjects")
      .eq("teacher_id", teacherId)
      .maybeSingle(),
    supabase
      .from("subjects")
      .select("subject_id, subject_name, branch, classes(class_name)")
      .order("class_id"),
    supabase
      .from("class_assignments")
      .select(
        "id, class_id, day_of_week, start_time, end_time, is_active, classes(class_name), subjects(subject_name)",
      )
      .eq("teacher_id", teacherId)
      .order("day_of_week")
      .order("start_time"),
    supabase
      .from("teacher_availability")
      .select("id, day_of_week, start_time, end_time")
      .eq("teacher_id", teacherId)
      .order("day_of_week")
      .order("start_time"),
    supabase
      .from("assignments")
      .select("id, class_id, classes(class_name)")
      .eq("teacher_id", teacherId),
    supabase
      .from("quizzes")
      .select("id, class_id, classes(class_name)")
      .eq("teacher_id", teacherId),
  ]);

  if (!teacher) notFound();

  const profile = teacher.profiles as unknown as {
    full_name: string;
    phone: string | null;
    user_id: string;
  };
  const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
  const preferredSubjects = new Set<string>((prefs?.subjects as string[]) ?? []);

  const classesTaught = new Map<number, string>();
  for (const row of schedule ?? []) {
    const cls = row.classes as unknown as { class_name: string } | null;
    if (cls) classesTaught.set(row.class_id, cls.class_name);
  }

  const statsByClass = new Map<string, { assignments: number; quizzes: number }>();
  for (const name of classesTaught.values()) {
    statsByClass.set(name, { assignments: 0, quizzes: 0 });
  }
  for (const a of assignments ?? []) {
    const name = (a.classes as unknown as { class_name: string } | null)?.class_name ?? "—";
    if (!statsByClass.has(name)) statsByClass.set(name, { assignments: 0, quizzes: 0 });
    statsByClass.get(name)!.assignments++;
  }
  for (const q of quizzes ?? []) {
    const name = (q.classes as unknown as { class_name: string } | null)?.class_name ?? "—";
    if (!statsByClass.has(name)) statsByClass.set(name, { assignments: 0, quizzes: 0 });
    statsByClass.get(name)!.quizzes++;
  }

  const subjectsByClass = new Map<
    string,
    { subject_id: string; subject_name: string; branch: string }[]
  >();
  for (const s of subjects ?? []) {
    const className = (s.classes as unknown as { class_name: string })?.class_name ?? "—";
    if (!subjectsByClass.has(className)) subjectsByClass.set(className, []);
    subjectsByClass.get(className)!.push({
      subject_id: s.subject_id,
      subject_name: s.subject_name,
      branch: s.branch,
    });
  }

  return (
    <PageShell>
      <PageHeader
        title={profile?.full_name}
        backHref="/admin/teachers"
        backLabel="رجوع للمدرسين"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span>
              {teacher.specialization ?? "بدون تخصص"}
              {teacher.qualification ? ` · ${teacher.qualification}` : ""} ·{" "}
              <span dir="ltr">{profile?.phone ?? "—"}</span>
            </span>
            {teacher.is_active ? (
              <Badge variant="success">نشط</Badge>
            ) : (
              <Badge variant="destructive">موقوف</Badge>
            )}
          </span>
        }
        action={
          teacher.cv_drive_id ? (
            <a
              href={`/api/files/${teacher.cv_drive_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline underline-offset-4"
            >
              تحميل السيرة الذاتية (CV) 📄
            </a>
          ) : undefined
        }
      />

      <EditTeacherForm
        teacherId={teacherId}
        fullName={profile?.full_name}
        email={authUser?.user?.email ?? ""}
        phone={profile?.phone ?? null}
        specialization={teacher.specialization}
        qualification={teacher.qualification}
      />

      <StatGrid cols={3}>
        <StatCard label="عدد الفصول" value={classesTaught.size} icon={Users} />
        <StatCard label="عدد الواجبات" value={(assignments ?? []).length} icon={ClipboardList} tone="info" />
        <StatCard label="عدد الاختبارات" value={(quizzes ?? []).length} icon={FileQuestion} tone="success" />
      </StatGrid>

      {statsByClass.size > 0 && (
        <SectionCard title="تفصيل حسب الفصل" contentClassName="-mx-4 overflow-x-auto sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الفصل</TableHead>
                  <TableHead>الواجبات</TableHead>
                  <TableHead>الاختبارات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...statsByClass.entries()].map(([name, s]) => (
                  <TableRow key={name}>
                    <TableCell>{name}</TableCell>
                    <TableCell>{s.assignments}</TableCell>
                    <TableCell>{s.quizzes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </SectionCard>
      )}

      <SectionCard
        title="الجدول الحالي"
        description="الحصص المسندة فعليًا لهذا المدرس في الجدول"
        contentClassName="-mx-4 overflow-x-auto sm:mx-0"
      >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اليوم</TableHead>
                <TableHead>الوقت</TableHead>
                <TableHead>الفصل</TableHead>
                <TableHead>المادة</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(schedule ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{DAY_LABELS[row.day_of_week as keyof typeof DAY_LABELS]}</TableCell>
                  <TableCell dir="ltr">
                    {formatTime(row.start_time)}–{formatTime(row.end_time)}
                  </TableCell>
                  <TableCell>
                    {(row.classes as unknown as { class_name: string })?.class_name}
                  </TableCell>
                  <TableCell>
                    {(row.subjects as unknown as { subject_name: string })?.subject_name}
                  </TableCell>
                  <TableCell>
                    {row.is_active ? (
                      <Badge variant="success">نشط</Badge>
                    ) : (
                      <Badge variant="outline">موقوف</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(schedule ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    لا توجد حصص مسندة بعد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </SectionCard>

      <SectionCard
        title="أوقات التفرغ"
        description="الأوقات التي حدّد المدرس أنه متاح فيها أسبوعيًا"
        contentClassName="space-y-2"
      >
          {(availability ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">لا توجد أوقات تفرغ محددة بعد</p>
          )}
          {DAYS.map((day) => {
            const daySlots = (availability ?? []).filter((a) => a.day_of_week === day);
            if (daySlots.length === 0) return null;
            return (
              <div key={day} className="flex flex-wrap items-center gap-2">
                <span className="w-20 font-medium">{DAY_LABELS[day]}</span>
                {daySlots.map((slot) => (
                  <span
                    key={slot.id}
                    className="rounded-full border px-3 py-1 text-xs"
                    dir="ltr"
                  >
                    {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
                  </span>
                ))}
              </div>
            );
          })}
      </SectionCard>

      <SectionCard
        title="المواد التي يمكنه تدريسها"
        description="تساعد في اقتراح توزيع الجدول تلقائيًا، ويمكن للمسؤول تعديلها هنا"
      >
          <form action={updateTeacherSubjects} className="space-y-6">
            <input type="hidden" name="teacher_id" value={teacherId} />
            {[...subjectsByClass.entries()].map(([className, subs]) => (
              <div key={className} className="space-y-2">
                <p className="font-medium">{className}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {subs.map((s) => (
                    <label
                      key={s.subject_id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        name="subjects"
                        value={s.subject_id}
                        defaultChecked={preferredSubjects.has(s.subject_id)}
                      />
                      {s.subject_name} {branchLabel(s.subject_name, s.branch)}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <Button type="submit" size="sm">
              حفظ المواد
            </Button>
          </form>
      </SectionCard>

      <AdminEditLogCard targetType="teacher" targetId={teacherId} />
    </PageShell>
  );
}
