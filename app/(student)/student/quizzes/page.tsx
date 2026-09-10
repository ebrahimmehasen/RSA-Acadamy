import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { RealtimeRefresh } from "@/components/shared/RealtimeRefresh";
import { PageShell } from "@/components/shared/PageShell";
import { CARD_LINK_CLASS } from "@/lib/ui";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function StudentQuizzesPage() {
  const session = await getSession();
  const supabase = await createClient();

  const { data: studentRow } = await supabase
    .from("students")
    .select("class_id")
    .eq("user_id", session!.profile.id)
    .maybeSingle();

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
    <PageShell>
      <RealtimeRefresh
        channelName={`quizzes:${session!.profile.id}`}
        watches={[
          ...(studentRow?.class_id
            ? [{ table: "quizzes", filter: `class_id=eq.${studentRow.class_id}` }]
            : []),
          { table: "quiz_submissions", filter: `student_id=eq.${session!.profile.id}` },
        ]}
      />
      <PageHeader title="الاختبارات" />
      <div className="grid gap-[var(--card-gap)]">
        {(quizzes ?? []).map((q) => {
          const submission = submissionByQuiz.get(q.id);
          const start = new Date(q.start_time);
          const end = new Date(q.end_time);
          const isLive = now >= start && now <= end;
          const isUpcoming = now < start;

          let statusBadge: React.ReactNode;
          if (submission?.status === "graded" || submission?.status === "submitted") {
            statusBadge = (
              <Badge variant="success">
                {submission.total_score ?? "—"}/{submission.max_score}
              </Badge>
            );
          } else if (isLive) {
            statusBadge = <Badge variant="warning">جارٍ الآن 🔴</Badge>;
          } else if (isUpcoming) {
            statusBadge = <Badge variant="info">قادم</Badge>;
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
              className={CARD_LINK_CLASS}
            >
              <Card className="transition-colors hover:bg-muted/40">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="min-w-0 truncate text-base">{q.title}</CardTitle>
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
          <EmptyState
            icon={FileQuestion}
            title="لا توجد اختبارات متاحة حتى الآن"
            description="تابع الجديد قريبًا!"
          />
        )}
      </div>
    </PageShell>
  );
}
