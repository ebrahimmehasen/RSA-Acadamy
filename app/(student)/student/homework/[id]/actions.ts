"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSubmissionBatch } from "@/lib/uploadLimits";
import {
  checkStudentCanSubmit,
  submissionFilesOf,
  type SubmissionFile,
} from "@/lib/submissions";

export interface SubmitResult {
  ok: boolean;
  message: string;
}

const ALREADY_SUBMITTED =
  "لديك حل مُسلَّم بالفعل لهذا الواجب، ويمكنك تعديل الحل الحالي إذا لم يتم تصحيحه";
const ALREADY_GRADED = "تم تصحيح هذا الواجب بالفعل — لا يمكن تعديل التسليم";

const idList = z.array(z.string().regex(/^[\w-]+$/)).max(50);

function parseIds(raw: FormDataEntryValue | null): string[] | null {
  if (raw == null || raw === "") return null;
  try {
    return idList.parse(JSON.parse(String(raw)));
  } catch {
    throw new Error("بيانات الملفات غير صحيحة");
  }
}

/**
 * Files are NOT sent here — the browser uploads them in chunks through
 * /api/uploads/submission first (which records each one in file_storage
 * under the student), then this action attaches those already-uploaded
 * files (`new_file_ids`) plus any existing ones to keep (`keep_file_ids`)
 * to the student's single submission for the assignment.
 */
export async function submitAssignment(
  _prev: SubmitResult | null,
  formData: FormData,
): Promise<SubmitResult> {
  try {
    const session = await requireRole("student");
    const studentId = session.profile.id;
    const assignmentId = z.coerce
      .number()
      .int()
      .positive()
      .parse(formData.get("assignment_id"));
    const intent = formData.get("intent") === "update" ? "update" : "create";
    const textAnswer = String(formData.get("text_answer") ?? "").trim();
    const newIds = parseIds(formData.get("new_file_ids")) ?? [];
    const keepIdsRaw = parseIds(formData.get("keep_file_ids"));

    const supabase = createAdminClient();

    const eligible = await checkStudentCanSubmit(supabase, studentId, assignmentId);
    if (!eligible.ok) return { ok: false, message: eligible.message };
    const assignment = eligible.assignment;

    // One submission per student per assignment (DB: unique
    // (assignment_id, student_id)). Creating a second one is a conflict;
    // the only way to change an answer is to update the existing row,
    // and only until it has been graded.
    const { data: existing } = await supabase
      .from("assignment_submissions")
      .select("id, status, files, file_drive_id, file_name")
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentId)
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

    // ---- which files does the final answer hold? -------------------
    const existingFiles: SubmissionFile[] = existing ? submissionFilesOf(existing) : [];
    const existingById = new Map(existingFiles.map((f) => [f.id, f]));
    // update without an explicit list keeps everything already there
    const keepIds = keepIdsRaw ?? existingFiles.map((f) => f.id);
    if (keepIds.some((id) => !existingById.has(id))) {
      return { ok: false, message: "ملف غير موجود في حلك الحالي" };
    }
    if (newIds.some((id) => existingById.has(id)) || new Set(newIds).size !== newIds.length) {
      return { ok: false, message: "ملف مكرر" };
    }

    // New files must be ones THIS student uploaded for THIS assignment —
    // sizes/names come from our own registry, never from the request.
    const lookupIds = [...keepIds, ...newIds];
    const meta = new Map<string, { name: string; size: number }>();
    if (lookupIds.length > 0) {
      const { data: rows } = await supabase
        .from("file_storage")
        .select("drive_file_id, file_name, file_size")
        .eq("entity_type", "assignment")
        .eq("entity_id", String(assignmentId))
        .eq("uploaded_by", studentId)
        .is("deleted_at", null)
        .in("drive_file_id", lookupIds);
      for (const r of rows ?? []) {
        meta.set(r.drive_file_id, { name: r.file_name, size: r.file_size ?? 0 });
      }
    }
    if (newIds.some((id) => !meta.has(id))) {
      return { ok: false, message: "تعذّر التحقق من الملفات المرفوعة — أعد رفعها" };
    }

    const finalFiles: SubmissionFile[] = [
      ...keepIds.map((id) => ({ id, name: existingById.get(id)!.name })),
      ...newIds.map((id) => ({ id, name: meta.get(id)!.name })),
    ];
    const limitError = validateSubmissionBatch(
      0,
      0,
      finalFiles.map((f) => ({ size: meta.get(f.id)?.size ?? 0 })),
    );
    if (limitError) return { ok: false, message: limitError };

    if (finalFiles.length > 0 && !assignment.allow_file) {
      return { ok: false, message: "هذا الواجب لا يقبل الملفات — يرجى كتابة إجابة نصية" };
    }
    if (finalFiles.length === 0 && !textAnswer) {
      return { ok: false, message: "ارفع ملفًا أو اكتب إجابة نصية" };
    }
    if (finalFiles.length === 0 && !assignment.allow_text) {
      return { ok: false, message: "يجب تسليم هذا الواجب كملف" };
    }

    const isLate = new Date() > new Date(assignment.due_date);
    const payload = {
      assignment_id: assignmentId,
      student_id: studentId,
      // file_drive_id/file_name mirror the first file for older readers
      file_drive_id: finalFiles[0]?.id ?? null,
      file_name: finalFiles[0]?.name ?? null,
      files: finalFiles,
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

    // Files the student dropped from the answer (or abandoned uploads)
    // are soft-deleted in the registry so they stop counting toward 5GB.
    const finalIds = new Set(finalFiles.map((f) => f.id));
    const { data: mine } = await supabase
      .from("file_storage")
      .select("drive_file_id")
      .eq("entity_type", "assignment")
      .eq("entity_id", String(assignmentId))
      .eq("uploaded_by", studentId)
      .is("deleted_at", null);
    const dropped = (mine ?? [])
      .map((r) => r.drive_file_id as string)
      .filter((id) => !finalIds.has(id));
    if (dropped.length > 0) {
      await supabase
        .from("file_storage")
        .update({ deleted_at: new Date().toISOString() })
        .eq("entity_type", "assignment")
        .eq("entity_id", String(assignmentId))
        .eq("uploaded_by", studentId)
        .in("drive_file_id", dropped);
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

/**
 * A student may withdraw their own answer until it has been graded. The
 * submission row is removed (so they can submit again), its files are
 * soft-deleted in the registry (they stop counting toward the 5GB; the
 * bytes stay in Drive). Graded answers are locked — the status guard on
 * the DELETE also closes the race with the teacher grading meanwhile.
 */
export async function deleteSubmission(assignmentId: number): Promise<SubmitResult> {
  try {
    const session = await requireRole("student");
    const studentId = session.profile.id;
    const id = z.number().int().positive().parse(assignmentId);
    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("assignment_submissions")
      .select("id, status")
      .eq("assignment_id", id)
      .eq("student_id", studentId)
      .maybeSingle();
    if (!existing) return { ok: false, message: "لا يوجد حل لحذفه" };
    if (existing.status === "graded") {
      return { ok: false, message: "تم تصحيح هذا الواجب — لا يمكن حذف الحل" };
    }

    const { data: deleted, error } = await supabase
      .from("assignment_submissions")
      .delete()
      .eq("id", existing.id)
      .eq("student_id", studentId)
      .eq("status", "submitted")
      .select("id");
    if (error) return { ok: false, message: error.message };
    if (!deleted || deleted.length === 0) {
      return { ok: false, message: "تم تصحيح هذا الواجب — لا يمكن حذف الحل" };
    }

    await supabase
      .from("file_storage")
      .update({ deleted_at: new Date().toISOString() })
      .eq("entity_type", "assignment")
      .eq("entity_id", String(id))
      .eq("uploaded_by", studentId)
      .is("deleted_at", null);

    revalidatePath(`/student/homework/${id}`);
    revalidatePath("/student/homework");
    return { ok: true, message: "تم حذف حلك" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "حدث خطأ",
    };
  }
}
