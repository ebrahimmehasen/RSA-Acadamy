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

const ALREADY_SUBMITTED =
  "لديك حل مُسلَّم بالفعل لهذا الواجب، ويمكنك تعديل الحل الحالي إذا لم يتم تصحيحه";
const ALREADY_GRADED = "تم تصحيح هذا الواجب بالفعل — لا يمكن تعديل التسليم";

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
    const intent = formData.get("intent") === "update" ? "update" : "create";
    const textAnswer = String(formData.get("text_answer") ?? "").trim();
    const file = formData.get("file") as File | null;
    const hasFile = file && file.size > 0;

    const supabase = createAdminClient();

    const { data: assignment } = await supabase
      .from("assignments")
      .select("id, class_id, branch, student_id, due_date, allow_file, allow_text, is_published")
      .eq("id", assignmentId)
      .single();
    if (!assignment || !assignment.is_published) {
      return { ok: false, message: "الواجب غير موجود" };
    }

    const { data: student } = await supabase
      .from("students")
      .select("class_id, branch")
      .eq("user_id", session.profile.id)
      .single();
    if (student?.class_id !== assignment.class_id) {
      return { ok: false, message: "هذا الواجب ليس لفصلك" };
    }
    // Private and normal assignments never cross: a private assignment is
    // only for its own student; a normal one is never for a 'Private'
    // student and still respects its Arabic/Languages branch targeting.
    // (Same rule as the assignments RLS policy — enforced here too because
    // this action writes with the service-role client.)
    if (assignment.student_id != null) {
      if (assignment.student_id !== session.profile.id) {
        return { ok: false, message: "هذا الواجب ليس لك" };
      }
    } else if (
      student?.branch === "Private" ||
      (assignment.branch != null && assignment.branch !== student?.branch)
    ) {
      return { ok: false, message: "هذا الواجب ليس لفصلك" };
    }

    // One submission per student per assignment (DB: unique
    // (assignment_id, student_id)). Creating a second one is a conflict;
    // the only way to change an answer is to update the existing row,
    // and only until it has been graded.
    const { data: existing } = await supabase
      .from("assignment_submissions")
      .select("id, status, file_drive_id, file_name")
      .eq("assignment_id", assignmentId)
      .eq("student_id", session.profile.id)
      .maybeSingle();
    if (existing?.status === "graded") {
      return { ok: false, message: ALREADY_GRADED };
    }
    if (existing && intent === "create") {
      return { ok: false, message: ALREADY_SUBMITTED };
    }
    if (!existing && intent === "update") {
      return { ok: false, message: "لا يوجد حل سابق لتعديله" };
    }

    // editing without picking a new file keeps the current one
    const keepsExistingFile = !hasFile && !!existing?.file_drive_id;
    if (!hasFile && !textAnswer && !keepsExistingFile) {
      return { ok: false, message: "ارفع ملف أو اكتب إجابة نصية" };
    }
    if (hasFile && !assignment.allow_file) {
      return { ok: false, message: "هذا الواجب لا يقبل الملفات — يرجى كتابة إجابة نصية" };
    }
    if (!hasFile && !keepsExistingFile && !assignment.allow_text) {
      return { ok: false, message: "يجب تسليم هذا الواجب كملف" };
    }

    let fileDriveId: string | null = keepsExistingFile
      ? (existing?.file_drive_id ?? null)
      : null;
    let fileName: string | null = keepsExistingFile ? (existing?.file_name ?? null) : null;
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

    if (existing) {
      // status guard closes the race with the teacher grading meanwhile
      const { data: updated, error } = await supabase
        .from("assignment_submissions")
        .update(payload)
        .eq("id", existing.id)
        .eq("status", "submitted")
        .select("id");
      if (error) return { ok: false, message: error.message };
      if (!updated || updated.length === 0) {
        return { ok: false, message: ALREADY_GRADED };
      }
    } else {
      const { error } = await supabase.from("assignment_submissions").insert(payload);
      if (error) {
        // unique (assignment_id, student_id): a concurrent request won
        if (error.code === "23505") return { ok: false, message: ALREADY_SUBMITTED };
        return { ok: false, message: error.message };
      }
    }

    revalidatePath(`/student/homework/${assignmentId}`);
    revalidatePath("/student/homework");
    return {
      ok: true,
      message:
        intent === "update"
          ? "تم تحديث حلك ✅"
          : isLate
            ? "تم التسليم (متأخر) ✅"
            : "تم التسليم بنجاح ✅ أحسنت!",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "حدث خطأ",
    };
  }
}
