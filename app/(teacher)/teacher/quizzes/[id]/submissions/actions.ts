"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";

export async function gradeQuizAnswer(formData: FormData) {
  const session = await requireRole("teacher");
  const answerId = z.coerce.number().int().positive().parse(formData.get("answer_id"));
  const submissionId = z.coerce.number().int().positive().parse(formData.get("submission_id"));
  const quizId = z.coerce.number().int().positive().parse(formData.get("quiz_id"));
  const points = z.coerce.number().int().min(0).parse(formData.get("points"));
  const maxPoints = z.coerce.number().int().min(0).parse(formData.get("max_points"));

  if (points > maxPoints) throw new Error(`الدرجة القصوى ${maxPoints}`);

  const supabase = createAdminClient();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("teacher_id")
    .eq("id", quizId)
    .single();
  if (quiz?.teacher_id !== session.profile.id) throw new Error("مش الكويز بتاعك");

  const { error } = await supabase
    .from("quiz_question_answers")
    .update({ points_awarded: points, is_correct: points === maxPoints })
    .eq("id", answerId);
  if (error) throw new Error(error.message);

  // if every answer in this submission now has a grade, finalize it
  const { data: answers } = await supabase
    .from("quiz_question_answers")
    .select("points_awarded")
    .eq("submission_id", submissionId);

  const allGraded = (answers ?? []).every((a) => a.points_awarded !== null);
  if (allGraded) {
    const total = (answers ?? []).reduce((sum, a) => sum + (a.points_awarded ?? 0), 0);
    const { data: submission } = await supabase
      .from("quiz_submissions")
      .update({ status: "graded", total_score: total })
      .eq("id", submissionId)
      .select("student_id, max_score")
      .single();

    if (submission) {
      await createNotification({
        profileId: submission.student_id,
        type: "quiz",
        title: "تم تصحيح اختبارك",
        message: `حصلت على ${total}/${submission.max_score}`,
        relatedId: quizId,
      });
    }
  }

  revalidatePath(`/teacher/quizzes/${quizId}/submissions`);
}
