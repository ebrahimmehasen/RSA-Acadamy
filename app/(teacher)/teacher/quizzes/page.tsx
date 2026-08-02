import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateQuizForm } from "./CreateQuizForm";

export default async function TeacherQuizzesPage() {
  const session = await getSession();
  const supabase = await createClient();

  const [{ data: slots }, { data: quizzes }] = await Promise.all([
    supabase
      .from("class_assignments")
      .select("class_id, subject_id, classes(class_name), subjects(subject_name)")
      .eq("teacher_id", session!.profile.id)
      .eq("is_active", true),
    supabase
      .from("quizzes")
      .select("id, title, is_published, start_time, classes(class_name), subjects(subject_name)")
      .eq("teacher_id", session!.profile.id)
      .order("start_time", { ascending: false }),
  ]);

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
      <h1 className="text-2xl font-bold">الاختبارات</h1>

      <CreateQuizForm slots={uniqueSlots} />

      <div className="grid gap-3">
        {(quizzes ?? []).map((q) => (
          <Link key={q.id} href={`/teacher/quizzes/${q.id}`}>
            <Card className="transition-colors hover:bg-accent">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{q.title}</CardTitle>
                  {q.is_published ? (
                    <Badge>منشور</Badge>
                  ) : (
                    <Badge variant="outline">مسودة</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {(q.classes as unknown as { class_name: string })?.class_name}
                {" · "}
                {(q.subjects as unknown as { subject_name: string })?.subject_name}
                {" · "}
                {new Date(q.start_time).toLocaleString("ar-EG")}
              </CardContent>
            </Card>
          </Link>
        ))}
        {(quizzes ?? []).length === 0 && (
          <p className="text-muted-foreground">مفيش اختبارات لسه</p>
        )}
      </div>
    </div>
  );
}
