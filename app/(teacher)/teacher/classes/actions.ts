"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UpdateZoomResult {
  ok: boolean;
  message: string;
}

const schema = z.object({
  slot_id: z.coerce.number().int().positive(),
  zoom_link: z.string().trim().url().optional().or(z.literal("")),
  zoom_meeting_id: z.string().trim().optional(),
  zoom_passcode: z.string().trim().optional(),
});

/**
 * Lets a teacher set/replace the join link for their own class slot —
 * class_assignments has no RLS write policy for teachers (admin-only),
 * so this uses the admin client but scopes the update to a row that's
 * actually theirs.
 */
export async function updateSlotZoom(
  _prev: UpdateZoomResult | null,
  formData: FormData,
): Promise<UpdateZoomResult> {
  try {
    const session = await requireRole("teacher");
    const parsed = schema.parse({
      slot_id: formData.get("slot_id"),
      zoom_link: formData.get("zoom_link") || "",
      zoom_meeting_id: formData.get("zoom_meeting_id") || "",
      zoom_passcode: formData.get("zoom_passcode") || "",
    });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("class_assignments")
      .update({
        zoom_link: parsed.zoom_link || null,
        zoom_meeting_id: parsed.zoom_meeting_id || null,
        zoom_passcode: parsed.zoom_passcode || null,
      })
      .eq("id", parsed.slot_id)
      .eq("teacher_id", session.profile.id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { ok: false, message: "هذه الحصة ليست ضمن حصصك" };

    revalidatePath("/teacher/classes");
    revalidatePath("/teacher/dashboard");
    return { ok: true, message: "تم حفظ رابط الحصة بنجاح" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, message: "رابط Zoom غير صحيح" };
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "حدث خطأ أثناء الحفظ",
    };
  }
}
