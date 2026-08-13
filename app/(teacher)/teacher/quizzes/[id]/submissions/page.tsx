import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { gradeQuizAnswer } from "./actions";
import { BackLink } from "@/components/shared/BackLink";
import { RealtimeRefresh } from "@/components/shared/RealtimeRefresh";

export default async function QuizSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quizId = Number(id);
  if (!Number.isInteger(quizId)) notFound();

  const session = await getSession();
  const supabase = await createClient();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, total_points")
    .eq("id", quizId)
    .eq("teacher_id", session!.profile.id)
    .maybeSingle();
  if (!quiz) notFound();

  // correct_answer is column-locked from the RLS-scoped client (see
  // 0011_quiz_answer_lockdown.sql) — ownership already verified above.
  const admin = createAdminClient();
  const [{ data: submissions }, { data: questions }] = await Promise.all([
    supabase
      .from("quiz_submissions")
      .select(
        "id, student_id, status, total_score, max_score, students!quiz_submissions_student_id_fkey(student_code, profiles!students_user_id_fkey(full_name))",
      )
      .eq("quiz_id", quizId)
      .order("submitted_at"),
    admin
      .from("quiz_questions")
      .select("id, question_text, question_type, points")
      .eq("quiz_id", quizId)
      .order("question_order"),
  ]);

  const manualTypes = new Set(["short_answer", "essay"]);
  const manualQuestionIds = new Set(
    (questions ?? []).filter((q) => manualTypes.has(q.question_type)).map((q) => q.id),
  );
  const pointsByQuestion = new Map((questions ?? []).map((q) => [q.id, q.points]));

  const submissionIds = (submissions ?? []).map((s) => s.id);
  const { data: allAnswers } = submissionIds.length
    ? await admin
        .from("quiz_question_answers")
        .select("*")
        .in("submission_id", submissionIds)
    : { data: [] };

  return (
    <div className="space-y-6">
      <RealtimeRefresh
        channelName={`quiz-submissions:${quizId}`}
        watches={[{ table: "quiz_submissions", filter: `quiz_id=eq.${quizId}` }]}
      />
      <BackLink href={`/teacher/quizzes/${quizId}`} label={`رجوع لـ ${quiz.title}`} />
      <div>
        <h1 className="text-2xl font-bold">تصحيح التسليمات — {quiz.title}</h1>
        <p className="text-muted-foreground">الدرجة الكلية: {quiz.total_points}</p>
      </div>

      {(submissions ?? []).map((submission) => {
        const student = submission.students as unknown as {
          student_code: string;
          profiles: { full_name: string };
        };
        const answers = (allAnswers ?? []).filter(
          (a) => a.submission_id === submission.id,
        );
        const pendingManual = answers.filter(
          (a) => manualQuestionIds.has(a.question_id) && a.points_awarded === null,
        );

        return (
          <Card key={submission.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">
                  {student?.profiles?.full_name}{" "}
                  <span className="font-mono text-muted-foreground" dir="ltr">
                    ({student?.student_code})
                  </span>
                </CardTitle>
                {submission.status === "graded" ? (
                  <Badge>
                    {submission.total_score}/{submission.max_score}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    {pendingManual.length} سؤال بانتظار التصحيح
                  </Badge>
                )}
              </div>
            </CardHeader>
            {pendingManual.length > 0 && (
              <CardContent className="space-y-4">
                {pendingManual.map((answer) => {
                  const question = (questions ?? []).find(
                    (q) => q.id === answer.question_id,
                  );
                  const maxPoints = pointsByQuestion.get(answer.question_id) ?? 0;
                  return (
                    <div key={answer.id} className="space-y-2 rounded-lg border p-3">
                      <p className="text-sm font-medium">{question?.question_text}</p>
                      <p className="rounded-md bg-muted p-2 text-sm">
                        {answer.student_answer || "(لم يجب)"}
                      </p>
                      <form
                        action={gradeQuizAnswer}
                        className="flex flex-wrap items-end gap-2"
                      >
                        <input type="hidden" name="answer_id" value={answer.id} />
                        <input
                          type="hidden"
                          name="submission_id"
                          value={submission.id}
                        />
                        <input type="hidden" name="quiz_id" value={quizId} />
                        <input type="hidden" name="max_points" value={maxPoints} />
                        <div className="space-y-1">
                          <label className="text-xs">الدرجة (من {maxPoints})</label>
                          <Input
                            name="points"
                            type="number"
                            min={0}
                            max={maxPoints}
                            required
                            dir="ltr"
                            className="w-24"
                          />
                        </div>
                        <Button type="submit" size="sm">
                          حفظ
                        </Button>
                      </form>
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        );
      })}
      {(submissions ?? []).length === 0 && (
        <p className="text-muted-foreground">مفيش تسليمات لسه</p>
      )}
    </div>
  );
}
