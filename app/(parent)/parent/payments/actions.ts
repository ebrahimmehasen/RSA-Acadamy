"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadPaymentProof, validateUpload } from "@/lib/googleDrive/upload";

export interface SubmitProofResult {
  ok: boolean;
  message: string;
}

/** Shared by parent (for a linked child) and student (self, no parent). */
export async function submitPaymentProof(
  _prev: SubmitProofResult | null,
  formData: FormData,
): Promise<SubmitProofResult> {
  try {
    const session = await requireRole("parent", "student");
    const instructionId = z.coerce
      .number()
      .int()
      .positive()
      .parse(formData.get("instruction_id"));
    const studentId = z.coerce
      .number()
      .int()
      .positive()
      .parse(formData.get("student_id"));
    const transactionId = String(formData.get("transaction_id") ?? "").trim();
    const payerMessage = String(formData.get("payer_message") ?? "").trim();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return { ok: false, message: "ارفع صورة أو PDF لإثبات التحويل" };
    }
    const validationError = validateUpload("payment", file.type, file.size);
    if (validationError) return { ok: false, message: validationError };

    const supabase = createAdminClient();

    // authorization: parent of the student, or the student themself with no parent
    const { data: student } = await supabase
      .from("students")
      .select("user_id, parent_id, class_id")
      .eq("user_id", studentId)
      .single();
    if (!student) return { ok: false, message: "الطالب غير موجود" };

    const isParent =
      session.profile.role === "parent" &&
      student.parent_id === session.profile.id;
    const isSelfPaying =
      session.profile.role === "student" &&
      student.user_id === session.profile.id &&
      student.parent_id === null;
    if (!isParent && !isSelfPaying) {
      return { ok: false, message: "مش مسموحلك تدفع للطالب ده" };
    }

    const { data: instruction } = await supabase
      .from("payment_instructions")
      .select("id, class_id, is_active")
      .eq("id", instructionId)
      .single();
    if (!instruction?.is_active || instruction.class_id !== student.class_id) {
      return { ok: false, message: "تعليمات الدفع دي مش متاحة للطالب" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadPaymentProof({
      buffer,
      fileName: file.name,
      mimeType: file.type,
      uploadedBy: session.profile.id,
      paymentId: instructionId,
      payerType: "student",
    });

    const { error } = await supabase.from("payment_submissions").insert({
      instruction_id: instructionId,
      student_id: studentId,
      payer_id: session.profile.id,
      file_drive_id: uploaded.fileId,
      file_name: file.name,
      transaction_id: transactionId || null,
      payer_message: payerMessage || null,
    });
    if (error) return { ok: false, message: error.message };

    revalidatePath("/parent/payments");
    revalidatePath("/student/profile");
    return { ok: true, message: "تم رفع الإثبات — في انتظار مراجعة الإدارة ⏳" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "حصل خطأ",
    };
  }
}
