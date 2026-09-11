"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  uploadProfilePicture,
  uploadTeacherCv,
  validateUpload,
} from "@/lib/googleDrive/upload";

const schema = z.object({
  full_name: z.string().min(3),
  phone: z.string().optional(),
});

export interface UpdateProfileResult {
  ok: boolean;
  message: string;
}

export async function updateProfile(
  _prev: UpdateProfileResult | null,
  formData: FormData,
): Promise<UpdateProfileResult> {
  try {
    const session = await requireAuth();
    const parsed = schema.parse({
      full_name: formData.get("full_name"),
      phone: formData.get("phone") || undefined,
    });

    const supabase = createAdminClient();
    const update: Record<string, string | null> = {
      full_name: parsed.full_name,
      phone: parsed.phone ?? null,
    };

    const pictureFile = formData.get("profile_picture") as File | null;
    if (pictureFile && pictureFile.size > 0) {
      const validationError = validateUpload(
        "profile",
        pictureFile.type,
        pictureFile.size,
      );
      if (validationError) return { ok: false, message: validationError };

      const buffer = Buffer.from(await pictureFile.arrayBuffer());
      const uploaded = await uploadProfilePicture({
        buffer,
        fileName: pictureFile.name,
        mimeType: pictureFile.type,
        uploadedBy: session.profile.id,
        profileId: session.profile.id,
        userType: session.profile.role,
      });
      update.profile_picture_url = uploaded.fileUrl;
      update.profile_picture_drive_id = uploaded.fileId;
    }

    const { error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", session.profile.id);
    if (error) throw new Error(error.message);

    revalidatePath("/settings/profile");
    return { ok: true, message: "تم حفظ البيانات بنجاح" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "حدث خطأ",
    };
  }
}

export interface UpdateTeacherCvResult {
  ok: boolean;
  message: string;
}

/** Teacher self-service CV replace — PDF only, mandatory file present. */
export async function updateTeacherCv(
  _prev: UpdateTeacherCvResult | null,
  formData: FormData,
): Promise<UpdateTeacherCvResult> {
  try {
    const session = await requireAuth();
    if (session.profile.role !== "teacher") {
      return { ok: false, message: "غير مسموح" };
    }

    const cvFile = formData.get("cv") as File | null;
    if (!cvFile || cvFile.size === 0) {
      return { ok: false, message: "السيرة الذاتية (CV) مطلوبة" };
    }
    if (cvFile.type !== "application/pdf") {
      return { ok: false, message: "السيرة الذاتية يجب أن تكون ملف PDF فقط" };
    }
    const validationError = validateUpload("teacher_cv", cvFile.type, cvFile.size);
    if (validationError) return { ok: false, message: validationError };

    const buffer = Buffer.from(await cvFile.arrayBuffer());
    const uploaded = await uploadTeacherCv({
      buffer,
      fileName: cvFile.name,
      mimeType: cvFile.type,
      uploadedBy: session.profile.id,
      teacherId: session.profile.id,
    });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("teachers")
      .update({ cv_drive_id: uploaded.fileId })
      .eq("user_id", session.profile.id);
    if (error) throw new Error(error.message);

    revalidatePath("/settings/profile");
    return { ok: true, message: "تم رفع السيرة الذاتية بنجاح" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "حدث خطأ",
    };
  }
}
