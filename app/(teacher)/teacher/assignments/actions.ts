"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  uploadTeacherAttachment,
  validateUpload,
} from "@/lib/googleDrive/upload";
import { createNotification } from "@/lib/notifications/create";
import { sendEmail } from "@/lib/email/resend";
import { assignmentGradedEmail } from "@/lib/email/templates";
import { getAuthEmail } from "@/lib/users";

const schema = z.object({
  class_id: z.coerce.number().int().positive(),
  subject_id: z.string().min(1),
  title: z.string().min(2),
  description: z.string().optional(),
  instructions: z.string().optional(),
  due_date: z.string().min(1),
  max_grade: z.coerce.number().int().min(1).max(100),
  allow_file: z.coerce.boolean(),
  allow_text: z.coerce.boolean(),
});

export interface ActionResult {
  ok: boolean;
  message: string;
}

export async function createAssignment(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const session = await requireRole("teacher");
    const parsed = schema.parse({
      class_id: formData.get("class_id"),
      subject_id: formData.get("subject_id"),
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      instructions: formData.get("instructions") || undefined,
      due_date: formData.get("due_date"),
      max_grade: formData.get("max_grade") || 100,
      allow_file: formData.get("allow_file") === "on",
      allow_text: formData.get("allow_text") === "on",
    });

    if (!parsed.allow_file && !parsed.allow_text) {
      return { ok: false, message: "لازم تسمح بملف أو إجابة نصية على الأقل" };
    }

    const files = formData
      .getAll("attachments")
      .filter((f): f is File => f instanceof File && f.size > 0)
      .slice(0, 3); // decision #18: max 3 files

    for (const file of files) {
      const err = validateUpload("teacher_attachment", file.type, file.size);
      if (err) return { ok: false, message: `${file.name}: ${err}` };
    }

    const supabase = createAdminClient();
    const { data: assignment, error } = await supabase
      .from("assignments")
      .insert({
        teacher_id: session.profile.id,
        class_id: parsed.class_id,
        subject_id: parsed.subject_id,
        title: parsed.title,
        description: parsed.description ?? null,
        instructions: parsed.instructions ?? null,
        due_date: new Date(parsed.due_date).toISOString(),
        max_grade: parsed.max_grade,
        allow_file: parsed.allow_file,
        allow_text: parsed.allow_text,
      })
      .select("id")
      .single();
    if (error) return { ok: false, message: error.message };

    if (files.length > 0) {
      const driveIds: string[] = [];
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploaded = await uploadTeacherAttachment({
          buffer,
          fileName: file.name,
          mimeType: file.type,
          uploadedBy: session.profile.id,
          assignmentId: assignment.id,
        });
        driveIds.push(uploaded.fileId);
      }
      await supabase
        .from("assignments")
        .update({ attachment_drive_ids: driveIds })
        .eq("id", assignment.id);
    }

    revalidatePath("/teacher/assignments");
    return { ok: true, message: "تم إنشاء الواجب ✅" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "حصل خطأ",
    };
  }
}

export async function gradeSubmission(formData: FormData) {
  const session = await requireRole("teacher");
  const submissionId = z.coerce
    .number()
    .int()
    .positive()
    .parse(formData.get("submission_id"));
  const assignmentId = z.coerce
    .number()
    .int()
    .positive()
    .parse(formData.get("assignment_id"));
  const grade = z.coerce.number().int().min(0).parse(formData.get("grade"));
  const notes = String(formData.get("teacher_notes") ?? "").trim();

  const supabase = createAdminClient();

  const { data: assignment } = await supabase
    .from("assignments")
    .select("teacher_id, max_grade, title")
    .eq("id", assignmentId)
    .single();
  if (assignment?.teacher_id !== session.profile.id) {
    throw new Error("مش واجبك تصححه");
  }
  if (grade > assignment.max_grade) {
    throw new Error(`الدرجة العظمى ${assignment.max_grade}`);
  }

  const { data: submission, error } = await supabase
    .from("assignment_submissions")
    .update({
      grade,
      teacher_notes: notes || null,
      status: "graded",
      graded_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .select("student_id, students!assignment_submissions_student_id_fkey(profiles!students_user_id_fkey(full_name))")
    .single();
  if (error) throw new Error(error.message);

  await createNotification({
    profileId: submission.student_id,
    type: "grade",
    title: "تم تصحيح واجبك",
    message: `حصلت على ${grade}/${assignment.max_grade}`,
    relatedId: assignmentId,
  });

  const studentEmail = await getAuthEmail(submission.student_id);
  if (studentEmail) {
    const studentName =
      (submission.students as unknown as { profiles: { full_name: string } })
        ?.profiles?.full_name ?? "الطالب";
    await sendEmail({
      to: studentEmail,
      subject: "تم تصحيح واجبك",
      html: assignmentGradedEmail({
        studentName,
        title: assignment.title,
        grade,
        maxGrade: assignment.max_grade,
      }),
    });
  }

  revalidatePath(`/teacher/assignments/${assignmentId}`);
}
