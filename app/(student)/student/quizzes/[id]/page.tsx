import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { QuizTakingForm } from "./QuizTakingForm";
import { BackLink } from "@/components/shared/BackLink";

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
      <div className="space-y-4">
        <BackLink href="/student/quizzes" label="رجوع للاختبارات" />
        <p className="text-muted-foreground">
          الاختبار لسه مبدأش — هيبدأ {start.toLocaleString("ar-EG")}
        </p>
      </div>
    );
  }
  if (now > end) {
    return (
      <div className="space-y-4">
        <BackLink href="/student/quizzes" label="رجوع للاختبارات" />
        <p className="text-muted-foreground">انتهى وقت الاختبار.</p>
      </div>
    );
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

      <QuizTakingForm
        quizId={quizId}
        questions={questions as {
          id: number;
          question_order: number;
          question_text: string;
          question_type: string;
          points: number;
          options: Record<string, string> | null;
        }[]}
      />
    </div>
  );
}
