"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFileUrl } from "@/lib/googleDrive/files";
import { redeemFileTicket, ticketField } from "@/lib/uploads/ticket";

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

    // the picture itself was uploaded straight to Drive (lib/uploads)
    const pictureTicket = ticketField(formData, "profile_picture_ticket");
    if (pictureTicket) {
      const picture = await redeemFileTicket(pictureTicket, {
        kind: "profile_picture",
        uploaderId: session.profile.id,
        entityId: session.profile.id,
      });
      update.profile_picture_url = getFileUrl(picture.driveFileId);
      update.profile_picture_drive_id = picture.driveFileId;
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

    // PDF-only + size are enforced when the upload starts (UPLOAD_RULES.teacher_cv)
    const cvTicket = ticketField(formData, "cv_ticket");
    if (!cvTicket) {
      return { ok: false, message: "السيرة الذاتية (CV) مطلوبة" };
    }
    const cv = await redeemFileTicket(cvTicket, {
      kind: "teacher_cv",
      uploaderId: session.profile.id,
      entityId: session.profile.id,
    });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("teachers")
      .update({ cv_drive_id: cv.driveFileId })
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
