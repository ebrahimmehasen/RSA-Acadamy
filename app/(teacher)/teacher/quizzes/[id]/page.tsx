import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { deleteQuestion, publishQuiz } from "../actions";
import { AddQuestionForm } from "./AddQuestionForm";

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: "اختيار من متعدد",
  checkboxes: "مربعات اختيار",
  dropdown: "قائمة منسدلة",
  true_false: "صح / خطأ",
  short_answer: "إجابة قصيرة",
  essay: "مقالي",
};

export default async function TeacherQuizDetailPage({
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
    .select("*, classes(class_name), subjects(subject_name)")
    .eq("id", quizId)
    .eq("teacher_id", session!.profile.id)
    .maybeSingle();
  if (!quiz) notFound();

  // correct_answer/explanation are column-locked from the RLS-scoped
  // client (see 0011_quiz_answer_lockdown.sql) — ownership of this
  // quiz was already verified above, so reading through the
  // service-role client here is safe.
  const admin = createAdminClient();
  const [{ data: questions }, { data: submissions }] = await Promise.all([
    admin
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("question_order"),
    supabase
      .from("quiz_submissions")
      .select("id, status, total_score, max_score")
      .eq("quiz_id", quizId),
  ]);

  const gradedCount = (submissions ?? []).filter(
    (s) => s.status === "graded",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{quiz.title}</h1>
          <p className="text-muted-foreground">
            {(quiz.classes as unknown as { class_name: string })?.class_name}
            {" · "}
            {(quiz.subjects as unknown as { subject_name: string })?.subject_name}
            {" · "}
            {quiz.duration_minutes} دقيقة · {quiz.total_points} درجة
          </p>
        </div>
        {quiz.is_published ? (
          <Badge>منشور</Badge>
        ) : (
          <form action={publishQuiz}>
            <input type="hidden" name="quiz_id" value={quizId} />
            <Button type="submit">نشر الاختبار</Button>
          </form>
        )}
      </div>

      {(submissions ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">النتائج</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {(submissions ?? []).length} تسليم · {gradedCount} مصحح
            </p>
            <Button
              size="sm"
              variant="outline"
              render={
                <Link href={`/teacher/quizzes/${quizId}/submissions`}>
                  مراجعة وتصحيح التسليمات
                </Link>
              }
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            الأسئلة ({(questions ?? []).length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(questions ?? []).map((q, i) => (
            <div
              key={q.id}
              className="flex items-start justify-between gap-3 rounded-lg border p-3"
            >
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  {i + 1}. {q.question_text}
                </p>
                <p className="text-muted-foreground">
                  {TYPE_LABELS[q.question_type]} · {q.points} درجة
                  {q.correct_answer && (
                    <span dir="ltr"> · ✓ {q.correct_answer}</span>
                  )}
                </p>
              </div>
              {!quiz.is_published && (
                <form action={deleteQuestion}>
                  <input type="hidden" name="question_id" value={q.id} />
                  <input type="hidden" name="quiz_id" value={quizId} />
                  <Button variant="destructive" size="xs" type="submit">
                    حذف
                  </Button>
                </form>
              )}
            </div>
          ))}
          {(questions ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">مفيش أسئلة لسه</p>
          )}
        </CardContent>
      </Card>

      {!quiz.is_published && <AddQuestionForm quizId={quizId} />}
    </div>
  );
}
