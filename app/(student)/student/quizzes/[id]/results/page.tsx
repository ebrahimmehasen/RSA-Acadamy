import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function QuizResultsPage({
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
    .select("title, total_points, show_answers_on_completion")
    .eq("id", quizId)
    .maybeSingle();
  if (!quiz) notFound();

  const { data: submission } = await supabase
    .from("quiz_submissions")
    .select("*")
    .eq("quiz_id", quizId)
    .eq("student_id", session!.profile.id)
    .maybeSingle();
  if (!submission) notFound();

  // Class average/rank need every student's score for this quiz, which
  // the RLS-scoped client can't see (quiz_submissions RLS is own-row
  // only) — safe to aggregate via the admin client since we only ever
  // expose a number and a rank position, never another student's
  // identity or answers.
  let classAverage: number | null = null;
  let rank: number | null = null;
  let totalRanked: number | null = null;
  if (submission.status === "graded") {
    const { data: allScores } = await createAdminClient()
      .from("quiz_submissions")
      .select("total_score")
      .eq("quiz_id", quizId)
      .eq("status", "graded")
      .order("total_score", { ascending: false });
    if (allScores && allScores.length > 0) {
      classAverage =
        Math.round(
          (allScores.reduce((sum, s) => sum + (s.total_score ?? 0), 0) /
            allScores.length) *
            10,
        ) / 10;
      rank =
        allScores.findIndex((s) => s.total_score === submission.total_score) + 1;
      totalRanked = allScores.length;
    }
  }

  // correct_answer is column-locked from the RLS-scoped client (see
  // 0011_quiz_answer_lockdown.sql) — ownership of this submission was
  // already verified above and reveal is gated on the quiz's own
  // show_answers_on_completion flag, so the admin client is safe here.
  const { data: answers } = quiz.show_answers_on_completion
    ? await createAdminClient()
        .from("quiz_question_answers")
        .select("*, quiz_questions(question_text, points, correct_answer)")
        .eq("submission_id", submission.id)
    : { data: null };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{quiz.title} — النتيجة</h1>
        {submission.status === "graded" ? (
          <p className="text-lg">
            <Badge className="text-base">
              {submission.total_score}/{submission.max_score} (
              {Math.round(
                ((submission.total_score ?? 0) / submission.max_score) * 100,
              )}
              %)
            </Badge>
          </p>
        ) : (
          <Badge variant="secondary">
            في انتظار تصحيح الأسئلة المقالية يدويًا
          </Badge>
        )}
      </div>

      {classAverage !== null && (
        <Card>
          <CardContent className="flex flex-wrap gap-6 py-4 text-sm">
            <p>
              متوسط الفصل: <b>{classAverage}</b>/{quiz.total_points}
            </p>
            {rank && totalRanked && (
              <p>
                ترتيبك: <b>{rank}</b> من {totalRanked}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {answers && (
        <div className="space-y-3">
          {answers.map((a) => {
            const question = a.quiz_questions as unknown as {
              question_text: string;
              points: number;
              correct_answer: string | null;
            };
            return (
              <Card key={a.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {question.question_text}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>إجابتك: {a.student_answer ?? "—"}</p>
                  {a.is_correct !== null && (
                    <p>
                      {a.is_correct ? "✅ صحيحة" : "❌ غير صحيحة"}
                      {" · "}
                      {a.points_awarded}/{question.points}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
