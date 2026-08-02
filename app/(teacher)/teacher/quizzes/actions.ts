"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

const createQuizSchema = z.object({
  class_id: z.coerce.number().int().positive(),
  subject_id: z.string().min(1),
  title: z.string().min(2),
  description: z.string().optional(),
  total_points: z.coerce.number().int().positive().default(100),
  duration_minutes: z.coerce.number().int().positive(),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  shuffle_questions: z.coerce.boolean(),
  assignment_id: z.coerce.number().int().positive().optional(),
});

export async function createQuiz(formData: FormData) {
  const session = await requireRole("teacher");
  const parsed = createQuizSchema.parse({
    class_id: formData.get("class_id"),
    subject_id: formData.get("subject_id"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    total_points: formData.get("total_points") || 100,
    duration_minutes: formData.get("duration_minutes"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    shuffle_questions: formData.get("shuffle_questions") === "on",
    assignment_id: formData.get("assignment_id") || undefined,
  });

  if (new Date(parsed.end_time) <= new Date(parsed.start_time)) {
    throw new Error("وقت النهاية لازم يكون بعد وقت البداية");
  }

  const supabase = createAdminClient();
  const { data: quiz, error } = await supabase
    .from("quizzes")
    .insert({
      class_id: parsed.class_id,
      subject_id: parsed.subject_id,
      teacher_id: session.profile.id,
      title: parsed.title,
      description: parsed.description ?? null,
      total_points: parsed.total_points,
      duration_minutes: parsed.duration_minutes,
      start_time: new Date(parsed.start_time).toISOString(),
      end_time: new Date(parsed.end_time).toISOString(),
      shuffle_questions: parsed.shuffle_questions,
      assignment_id: parsed.assignment_id ?? null,
      quiz_type: parsed.assignment_id ? "embedded" : "standalone",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  redirect(`/teacher/quizzes/${quiz.id}`);
}

const questionSchema = z.object({
  question_text: z.string().min(1),
  question_type: z.enum(["multiple_choice", "short_answer", "true_false", "essay"]),
  points: z.coerce.number().int().positive().default(1),
  option_a: z.string().optional(),
  option_b: z.string().optional(),
  option_c: z.string().optional(),
  option_d: z.string().optional(),
  correct_answer: z.string().optional(),
});

export async function addQuestion(formData: FormData) {
  const session = await requireRole("teacher");
  const quizId = z.coerce.number().int().positive().parse(formData.get("quiz_id"));

  const supabase = createAdminClient();
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("teacher_id")
    .eq("id", quizId)
    .single();
  if (quiz?.teacher_id !== session.profile.id) throw new Error("مش الكويز بتاعك");

  const parsed = questionSchema.parse({
    question_text: formData.get("question_text"),
    question_type: formData.get("question_type"),
    points: formData.get("points") || 1,
    option_a: formData.get("option_a") || undefined,
    option_b: formData.get("option_b") || undefined,
    option_c: formData.get("option_c") || undefined,
    option_d: formData.get("option_d") || undefined,
    correct_answer: formData.get("correct_answer") || undefined,
  });

  let options: Record<string, string> | null = null;
  if (parsed.question_type === "multiple_choice") {
    options = {};
    if (parsed.option_a) options.A = parsed.option_a;
    if (parsed.option_b) options.B = parsed.option_b;
    if (parsed.option_c) options.C = parsed.option_c;
    if (parsed.option_d) options.D = parsed.option_d;
  } else if (parsed.question_type === "true_false") {
    options = { true: "صح", false: "خطأ" };
  }

  const { count } = await supabase
    .from("quiz_questions")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quizId);

  const { error } = await supabase.from("quiz_questions").insert({
    quiz_id: quizId,
    question_order: (count ?? 0) + 1,
    question_text: parsed.question_text,
    question_type: parsed.question_type,
    points: parsed.points,
    options,
    correct_answer: parsed.correct_answer || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/teacher/quizzes/${quizId}`);
}

export async function deleteQuestion(formData: FormData) {
  const session = await requireRole("teacher");
  const questionId = z.coerce.number().int().parse(formData.get("question_id"));
  const quizId = z.coerce.number().int().parse(formData.get("quiz_id"));

  const supabase = createAdminClient();
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("teacher_id")
    .eq("id", quizId)
    .single();
  if (quiz?.teacher_id !== session.profile.id) throw new Error("مش الكويز بتاعك");

  const { error } = await supabase
    .from("quiz_questions")
    .delete()
    .eq("id", questionId);
  if (error) throw new Error(error.message);

  revalidatePath(`/teacher/quizzes/${quizId}`);
}

export async function publishQuiz(formData: FormData) {
  const session = await requireRole("teacher");
  const quizId = z.coerce.number().int().parse(formData.get("quiz_id"));

  const supabase = createAdminClient();
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("teacher_id")
    .eq("id", quizId)
    .single();
  if (quiz?.teacher_id !== session.profile.id) throw new Error("مش الكويز بتاعك");

  const { count } = await supabase
    .from("quiz_questions")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quizId);
  if (!count) throw new Error("لازم تضيف سؤال واحد على الأقل قبل النشر");

  const { error } = await supabase
    .from("quizzes")
    .update({ is_published: true })
    .eq("id", quizId);
  if (error) throw new Error(error.message);

  revalidatePath(`/teacher/quizzes/${quizId}`);
  revalidatePath("/teacher/quizzes");
}
