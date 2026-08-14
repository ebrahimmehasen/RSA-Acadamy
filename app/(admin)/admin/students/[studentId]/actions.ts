"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminEdit } from "@/lib/adminLog";

export async function adminUpdateAssignmentGrade(formData: FormData) {
  const session = await requireRole("admin");
  const submissionId = z.coerce.number().int().positive().parse(formData.get("submission_id"));
  const studentId = z.coerce.number().int().positive().parse(formData.get("student_id"));
  const grade = z.coerce.number().int().min(0).parse(formData.get("grade"));

  const supabase = createAdminClient();
  const { data: submission, error } = await supabase
    .from("assignment_submissions")
    .update({ grade, status: "graded", graded_at: new Date().toISOString() })
    .eq("id", submissionId)
    .eq("student_id", studentId)
    .select("assignments(title)")
    .single();
  if (error) throw new Error(error.message);

  const title =
    (submission?.assignments as unknown as { title: string } | null)?.title ?? "واجب";
  await logAdminEdit({
    adminId: session.profile.id,
    adminName: session.profile.full_name,
    targetType: "student",
    targetId: studentId,
    description: `تعديل درجة واجب "${title}" إلى ${grade}`,
  });

  revalidatePath(`/admin/students/${studentId}`);
}

export async function adminUpdateQuizGrade(formData: FormData) {
  const session = await requireRole("admin");
  const submissionId = z.coerce.number().int().positive().parse(formData.get("submission_id"));
  const studentId = z.coerce.number().int().positive().parse(formData.get("student_id"));
  const score = z.coerce.number().int().min(0).parse(formData.get("score"));

  const supabase = createAdminClient();
  const { data: submission, error } = await supabase
    .from("quiz_submissions")
    .update({ total_score: score, status: "graded" })
    .eq("id", submissionId)
    .eq("student_id", studentId)
    .select("quizzes(title)")
    .single();
  if (error) throw new Error(error.message);

  const title = (submission?.quizzes as unknown as { title: string } | null)?.title ?? "اختبار";
  await logAdminEdit({
    adminId: session.profile.id,
    adminName: session.profile.full_name,
    targetType: "student",
    targetId: studentId,
    description: `تعديل درجة اختبار "${title}" إلى ${score}`,
  });

  revalidatePath(`/admin/students/${studentId}`);
}
