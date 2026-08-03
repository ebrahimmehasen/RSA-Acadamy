import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAY_LABELS, formatTime } from "@/lib/schedule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateTeacherSubjects } from "../actions";

export default async function AdminTeacherDetailPage({
  params,
}: {
  params: Promise<{ teacherId: string }>;
}) {
  const { teacherId: teacherIdParam } = await params;
  const teacherId = Number(teacherIdParam);
  if (!Number.isInteger(teacherId) || teacherId <= 0) notFound();

  const supabase = createAdminClient();

  const [{ data: teacher }, { data: prefs }, { data: subjects }, { data: schedule }] =
    await Promise.all([
      supabase
        .from("teachers")
        .select("user_id, specialization, is_active, profiles!teachers_user_id_fkey(full_name, phone)")
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
        .select("id, day_of_week, start_time, end_time, is_active, classes(class_name), subjects(subject_name)")
        .eq("teacher_id", teacherId)
        .order("day_of_week")
        .order("start_time"),
    ]);

  if (!teacher) notFound();

  const profile = teacher.profiles as unknown as {
    full_name: string;
    phone: string | null;
  };
  const preferredSubjects = new Set<string>((prefs?.subjects as string[]) ?? []);

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{profile?.full_name}</h1>
        <p className="text-muted-foreground">
          {teacher.specialization ?? "بدون تخصص"} ·{" "}
          <span dir="ltr">{profile?.phone ?? "—"}</span> ·{" "}
          {teacher.is_active ? <Badge>نشط</Badge> : <Badge variant="destructive">موقوف</Badge>}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الجدول الحالي</CardTitle>
          <CardDescription>الحصص المسندة فعليًا للمدرس ده في الجدول</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">اليوم</TableHead>
                <TableHead className="text-right">الوقت</TableHead>
                <TableHead className="text-right">الفصل</TableHead>
                <TableHead className="text-right">المادة</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
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
                    {row.is_active ? <Badge>نشط</Badge> : <Badge variant="outline">موقوف</Badge>}
                  </TableCell>
                </TableRow>
              ))}
              {(schedule ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    مفيش حصص مسندة لسه
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">المواد اللي يقدر يدرّسها</CardTitle>
          <CardDescription>
            بتساعد في اقتراح توزيع الجدول تلقائيًا — الأدمن بيقدر يعدّلها هنا
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                      {s.subject_name} ({s.branch === "Arabic" ? "عربي" : "لغات"})
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <Button type="submit" size="sm">
              حفظ المواد
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
