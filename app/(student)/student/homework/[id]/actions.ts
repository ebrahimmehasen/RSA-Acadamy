"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadAssignmentFile, validateUpload } from "@/lib/googleDrive/upload";

export interface SubmitResult {
  ok: boolean;
  message: string;
}

export async function submitAssignment(
  _prev: SubmitResult | null,
  formData: FormData,
): Promise<SubmitResult> {
  try {
    const session = await requireRole("student");
    const assignmentId = z.coerce
      .number()
      .int()
      .positive()
      .parse(formData.get("assignment_id"));
    const textAnswer = String(formData.get("text_answer") ?? "").trim();
    const file = formData.get("file") as File | null;
    const hasFile = file && file.size > 0;

    if (!hasFile && !textAnswer) {
      return { ok: false, message: "ارفع ملف أو اكتب إجابة نصية" };
    }

    const supabase = createAdminClient();

    const { data: assignment } = await supabase
      .from("assignments")
      .select("id, class_id, due_date, allow_file, allow_text, is_published")
      .eq("id", assignmentId)
      .single();
    if (!assignment || !assignment.is_published) {
      return { ok: false, message: "الواجب غير موجود" };
    }

    const { data: student } = await supabase
      .from("students")
      .select("class_id")
      .eq("user_id", session.profile.id)
      .single();
    if (student?.class_id !== assignment.class_id) {
      return { ok: false, message: "الواجب ده مش لفصلك" };
    }

    if (hasFile && !assignment.allow_file) {
      return { ok: false, message: "الواجب ده مايقبلش ملفات — اكتب إجابة نصية" };
    }
    if (!hasFile && !assignment.allow_text) {
      return { ok: false, message: "الواجب ده لازم يتسلم كملف" };
    }

    // block re-submission after grading
    const { data: existing } = await supabase
      .from("assignment_submissions")
      .select("id, status")
      .eq("assignment_id", assignmentId)
      .eq("student_id", session.profile.id)
      .maybeSingle();
    if (existing?.status === "graded") {
      return { ok: false, message: "الواجب اتصحح خلاص — مينفعش تعدل التسليم" };
    }

    let fileDriveId: string | null = null;
    let fileName: string | null = null;
    if (hasFile) {
      const validationError = validateUpload("assignment", file.type, file.size);
      if (validationError) return { ok: false, message: validationError };

      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await uploadAssignmentFile({
        buffer,
        fileName: file.name,
        mimeType: file.type,
        uploadedBy: session.profile.id,
        studentId: session.profile.id,
        assignmentId,
      });
      fileDriveId = uploaded.fileId;
      fileName = file.name;
    }

    const isLate = new Date() > new Date(assignment.due_date);
    const payload = {
      assignment_id: assignmentId,
      student_id: session.profile.id,
      file_drive_id: fileDriveId,
      file_name: fileName,
      text_answer: textAnswer || null,
      is_late: isLate,
      status: "submitted" as const,
      submitted_at: new Date().toISOString(),
    };

    const { error } = existing
      ? await supabase
          .from("assignment_submissions")
          .update(payload)
          .eq("id", existing.id)
      : await supabase.from("assignment_submissions").insert(payload);
    if (error) return { ok: false, message: error.message };

    revalidatePath(`/student/homework/${assignmentId}`);
    revalidatePath("/student/homework");
    return {
      ok: true,
      message: isLate ? "تم التسليم (متأخر) ✅" : "تم التسليم ✅",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "حصل خطأ",
    };
  }
}
