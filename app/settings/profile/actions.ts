"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadProfilePicture, validateUpload } from "@/lib/googleDrive/upload";

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
      message: error instanceof Error ? error.message : "حصل خطأ",
    };
  }
}
