"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  uploadRecordedSession,
  validateUpload,
} from "@/lib/googleDrive/upload";

export interface UploadResult {
  ok: boolean;
  message: string;
}

export async function uploadSession(
  _prev: UploadResult | null,
  formData: FormData,
): Promise<UploadResult> {
  try {
    const session = await requireRole("teacher");
    const classId = z.coerce
      .number()
      .int()
      .positive()
      .parse(formData.get("class_id"));
    const subjectId = z.string().min(1).parse(formData.get("subject_id"));
    const title = z.string().min(2).parse(formData.get("title"));
    const description = String(formData.get("description") ?? "").trim();
    const video = formData.get("video") as File | null;

    if (!video || video.size === 0) {
      return { ok: false, message: "ارفع ملف فيديو" };
    }
    const validationError = validateUpload("session", video.type, video.size);
    if (validationError) return { ok: false, message: validationError };

    const supabase = createAdminClient();

    // authorize: teacher must actually teach this class+subject
    const { count } = await supabase
      .from("class_assignments")
      .select("id", { count: "exact", head: true })
      .eq("teacher_id", session.profile.id)
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .eq("is_active", true);
    if (!count) return { ok: false, message: "مش بتدرس المادة دي للفصل ده" };

    const { data: subject } = await supabase
      .from("subjects")
      .select("subject_name")
      .eq("subject_id", subjectId)
      .single();

    const { data: created, error: insertError } = await supabase
      .from("recorded_sessions")
      .insert({
        class_id: classId,
        subject_id: subjectId,
        teacher_id: session.profile.id,
        uploaded_by: session.profile.id,
        title,
        description: description || null,
        video_drive_id: "pending",
      })
      .select("id")
      .single();
    if (insertError) return { ok: false, message: insertError.message };

    const buffer = Buffer.from(await video.arrayBuffer());
    const uploaded = await uploadRecordedSession({
      buffer,
      fileName: video.name,
      mimeType: video.type,
      uploadedBy: session.profile.id,
      sessionId: created.id,
      subjectFolder: (subject?.subject_name ?? "General").replace(/[/\\]/g, "-"),
    });

    await supabase
      .from("recorded_sessions")
      .update({ video_drive_id: uploaded.fileId, video_size: video.size })
      .eq("id", created.id);

    revalidatePath("/teacher/sessions");
    return { ok: true, message: "تم رفع الحصة ✅" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "حصل خطأ",
    };
  }
}
