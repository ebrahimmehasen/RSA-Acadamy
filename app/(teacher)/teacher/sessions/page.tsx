import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UploadSessionForm } from "./UploadSessionForm";

export default async function TeacherSessionsPage() {
  const session = await getSession();
  const supabase = await createClient();

  const [{ data: slots }, { data: sessions }] = await Promise.all([
    supabase
      .from("class_assignments")
      .select("class_id, subject_id, classes(class_name), subjects(subject_name)")
      .eq("teacher_id", session!.profile.id)
      .eq("is_active", true),
    supabase
      .from("recorded_sessions")
      .select("id, title, view_count, total_rating, rating_count, classes(class_name)")
      .eq("teacher_id", session!.profile.id)
      .order("created_at", { ascending: false }),
  ]);

  const classIds = [...new Set((slots ?? []).map((s) => s.class_id))];
  const { data: classStudents } = classIds.length
    ? await supabase
        .from("students")
        .select("user_id, class_id, profiles!students_user_id_fkey(full_name)")
        .in("class_id", classIds)
        .eq("is_active", true)
    : { data: [] };

  const studentsByClass: Record<number, { id: number; name: string }[]> = {};
  for (const student of classStudents ?? []) {
    const list = studentsByClass[student.class_id] ?? [];
    list.push({
      id: student.user_id,
      name:
        (student.profiles as unknown as { full_name: string })?.full_name ??
        "",
    });
    studentsByClass[student.class_id] = list;
  }

  const seen = new Set<string>();
  const uniqueSlots = (slots ?? [])
    .filter((s) => {
      const key = `${s.class_id}|${s.subject_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((s) => ({
      classId: s.class_id,
      className: (s.classes as unknown as { class_name: string })?.class_name,
      subjectId: s.subject_id,
      subjectName: (s.subjects as unknown as { subject_name: string })?.subject_name,
    }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الحصص المسجلة</h1>

      <UploadSessionForm slots={uniqueSlots} studentsByClass={studentsByClass} />

      <div className="grid gap-3">
        {(sessions ?? []).map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="text-base">{s.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>
                {(s.classes as unknown as { class_name: string })?.class_name}
              </span>
              <Badge variant="outline">{s.view_count} مشاهدة</Badge>
              {s.rating_count > 0 && (
                <Badge variant="outline">
                  ⭐ {s.total_rating} ({s.rating_count})
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
        {(sessions ?? []).length === 0 && (
          <p className="text-muted-foreground">مفيش حصص مرفوعة لسه</p>
        )}
      </div>
    </div>
  );
}
