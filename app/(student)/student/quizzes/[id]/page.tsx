import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { submitQuiz } from "./actions";

// Deterministic per (quiz, student) shuffle: keeps the render pure (no
// Math.random() during render) and keeps the question order stable across
// reloads for the same student, instead of re-shuffling every render.
function seededShuffle<T>(items: T[], seed: number): T[] {
  let state = seed >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default async function TakeQuizPage({
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
    .select("*, subjects(subject_name)")
    .eq("id", quizId)
    .eq("is_published", true)
    .maybeSingle();
  if (!quiz) notFound();

  const { data: existing } = await supabase
    .from("quiz_submissions")
    .select("id, status")
    .eq("quiz_id", quizId)
    .eq("student_id", session!.profile.id)
    .maybeSingle();
  if (existing) redirect(`/student/quizzes/${quizId}/results`);

  const now = new Date();
  const start = new Date(quiz.start_time);
  const end = new Date(quiz.end_time);
  if (now < start) {
    return (
      <p className="text-muted-foreground">
        الاختبار لسه مبدأش — هيبدأ {start.toLocaleString("ar-EG")}
      </p>
    );
  }
  if (now > end) {
    return <p className="text-muted-foreground">انتهى وقت الاختبار.</p>;
  }

  let { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, question_order, question_text, question_type, points, options")
    .eq("quiz_id", quizId)
    .order("question_order");
  questions = questions ?? [];
  if (quiz.shuffle_questions) {
    questions = seededShuffle(questions, quizId * 1000003 + session!.profile.id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{quiz.title}</h1>
        <p className="text-muted-foreground">
          {(quiz.subjects as unknown as { subject_name: string })?.subject_name}
          {" · "}
          {quiz.duration_minutes} دقيقة · {quiz.total_points} درجة · ينتهي
          الوقت {end.toLocaleTimeString("ar-EG")}
        </p>
      </div>

      <form action={submitQuiz} className="space-y-4">
        <input type="hidden" name="quiz_id" value={quizId} />

        {questions.map((q, i) => (
          <Card key={q.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {i + 1}. {q.question_text}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({q.points} درجة)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {q.question_type === "multiple_choice" && (
                <div className="space-y-2">
                  {Object.entries((q.options as Record<string, string>) ?? {}).map(
                    ([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="radio"
                          name={`answer_${q.id}`}
                          value={key}
                          required
                        />
                        {key}. {label}
                      </label>
                    ),
                  )}
                </div>
              )}
              {q.question_type === "true_false" && (
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="radio" name={`answer_${q.id}`} value="true" required />
                    صح
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name={`answer_${q.id}`} value="false" required />
                    خطأ
                  </label>
                </div>
              )}
              {q.question_type === "short_answer" && (
                <Input name={`answer_${q.id}`} required dir="rtl" />
              )}
              {q.question_type === "essay" && (
                <Textarea name={`answer_${q.id}`} rows={4} required />
              )}
            </CardContent>
          </Card>
        ))}

        <Button type="submit" size="lg">
          تسليم الاختبار
        </Button>
      </form>
    </div>
  );
}
