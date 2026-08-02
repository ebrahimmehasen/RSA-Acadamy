"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

/** Objective types are auto-graded; short_answer/essay wait for the teacher. */
const AUTO_GRADED = new Set(["multiple_choice", "true_false"]);

export async function submitQuiz(formData: FormData) {
  const session = await requireRole("student");
  const quizId = z.coerce.number().int().positive().parse(formData.get("quiz_id"));

  const supabase = createAdminClient();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, class_id, total_points, end_time, is_published")
    .eq("id", quizId)
    .single();
  if (!quiz?.is_published) throw new Error("الاختبار غير متاح");

  const { data: student } = await supabase
    .from("students")
    .select("class_id")
    .eq("user_id", session.profile.id)
    .single();
  if (student?.class_id !== quiz.class_id) throw new Error("الاختبار ده مش لفصلك");

  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId);
  if (!questions?.length) throw new Error("الاختبار مفيش فيه أسئلة");

  const { data: existing } = await supabase
    .from("quiz_submissions")
    .select("id, status")
    .eq("quiz_id", quizId)
    .eq("student_id", session.profile.id)
    .maybeSingle();
  if (existing?.status === "graded" || existing?.status === "submitted") {
    redirect(`/student/quizzes/${quizId}/results`);
  }

  let totalAwarded = 0;
  let hasUngraded = false;
  const answerRows: {
    question_id: number;
    student_answer: string | null;
    is_correct: boolean | null;
    points_awarded: number | null;
  }[] = [];

  for (const question of questions) {
    const raw = formData.get(`answer_${question.id}`);
    const answer = typeof raw === "string" ? raw.trim() : null;

    if (AUTO_GRADED.has(question.question_type)) {
      const correct =
        !!answer &&
        !!question.correct_answer &&
        answer.toLowerCase() === question.correct_answer.toLowerCase();
      const awarded = correct ? question.points : 0;
      totalAwarded += awarded;
      answerRows.push({
        question_id: question.id,
        student_answer: answer,
        is_correct: correct,
        points_awarded: awarded,
      });
    } else if (question.question_type === "short_answer") {
      const correct =
        !!answer &&
        !!question.correct_answer &&
        answer.toLowerCase() === question.correct_answer.toLowerCase();
      const awarded = correct ? question.points : 0;
      totalAwarded += awarded;
      answerRows.push({
        question_id: question.id,
        student_answer: answer,
        is_correct: correct,
        points_awarded: awarded,
      });
    } else {
      // essay — needs manual grading
      hasUngraded = true;
      answerRows.push({
        question_id: question.id,
        student_answer: answer,
        is_correct: null,
        points_awarded: null,
      });
    }
  }

  const submissionId = existing
    ? existing.id
    : (
        await supabase
          .from("quiz_submissions")
          .insert({
            quiz_id: quizId,
            student_id: session.profile.id,
            max_score: quiz.total_points,
            ip_address: null,
            user_agent: null,
          })
          .select("id")
          .single()
      ).data!.id;

  const { error: updateError } = await supabase
    .from("quiz_submissions")
    .update({
      submitted_at: new Date().toISOString(),
      total_score: hasUngraded ? null : totalAwarded,
      status: hasUngraded ? "submitted" : "graded",
    })
    .eq("id", submissionId);
  if (updateError) throw new Error(updateError.message);

  const { error: answersError } = await supabase
    .from("quiz_question_answers")
    .upsert(
      answerRows.map((row) => ({ ...row, submission_id: submissionId })),
      { onConflict: "submission_id,question_id" },
    );
  if (answersError) throw new Error(answersError.message);

  redirect(`/student/quizzes/${quizId}/results`);
}
