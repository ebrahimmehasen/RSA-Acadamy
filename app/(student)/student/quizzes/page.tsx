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

export default async function StudentQuizzesPage() {
  const session = await getSession();
  const supabase = await createClient();

  const [{ data: quizzes }, { data: submissions }] = await Promise.all([
    supabase
      .from("quizzes")
      .select("id, title, start_time, end_time, duration_minutes, total_points, subjects(subject_name)")
      .eq("is_published", true)
      .order("start_time", { ascending: false }),
    supabase
      .from("quiz_submissions")
      .select("quiz_id, status, total_score, max_score")
      .eq("student_id", session!.profile.id),
  ]);

  const submissionByQuiz = new Map((submissions ?? []).map((s) => [s.quiz_id, s]));
  const now = new Date();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الاختبارات</h1>
      <div className="grid gap-3">
        {(quizzes ?? []).map((q) => {
          const submission = submissionByQuiz.get(q.id);
          const start = new Date(q.start_time);
          const end = new Date(q.end_time);
          const isLive = now >= start && now <= end;
          const isUpcoming = now < start;

          let statusBadge: React.ReactNode;
          if (submission?.status === "graded" || submission?.status === "submitted") {
            statusBadge = (
              <Badge>
                {submission.total_score ?? "—"}/{submission.max_score}
              </Badge>
            );
          } else if (isLive) {
            statusBadge = <Badge variant="secondary">جارٍ الآن 🔴</Badge>;
          } else if (isUpcoming) {
            statusBadge = <Badge variant="outline">قادم</Badge>;
          } else {
            statusBadge = <Badge variant="destructive">انتهى</Badge>;
          }

          return (
            <Link
              key={q.id}
              href={
                submission
                  ? `/student/quizzes/${q.id}/results`
                  : `/student/quizzes/${q.id}`
              }
            >
              <Card className="transition-colors hover:bg-accent">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{q.title}</CardTitle>
                    {statusBadge}
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {(q.subjects as unknown as { subject_name: string })?.subject_name}
                  {" · "}
                  {q.duration_minutes} دقيقة · {q.total_points} درجة
                  {" · "}
                  {start.toLocaleString("ar-EG")}
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {(quizzes ?? []).length === 0 && (
          <p className="text-muted-foreground">مفيش اختبارات لسه</p>
        )}
      </div>
    </div>
  );
}
