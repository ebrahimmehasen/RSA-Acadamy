"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAYS } from "@/lib/schedule";

const slotSchema = z.object({
  class_id: z.coerce.number().int().positive(),
  subject_id: z.string().min(1),
  teacher_id: z.coerce.number().int().positive().nullable(),
  day_of_week: z.enum(DAYS),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  zoom_link: z.union([z.url(), z.literal("")]).transform((v) => v || null),
  zoom_meeting_id: z.string().transform((v) => v || null),
  zoom_passcode: z.string().transform((v) => v || null),
});

export async function createSlot(formData: FormData) {
  const session = await requireRole("admin");

  const parsed = slotSchema.parse({
    class_id: formData.get("class_id"),
    subject_id: formData.get("subject_id"),
    teacher_id: formData.get("teacher_id") || null,
    day_of_week: formData.get("day_of_week"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
    zoom_link: formData.get("zoom_link") ?? "",
    zoom_meeting_id: formData.get("zoom_meeting_id") ?? "",
    zoom_passcode: formData.get("zoom_passcode") ?? "",
  });

  if (parsed.end_time <= parsed.start_time) {
    throw new Error("وقت النهاية لازم يكون بعد وقت البداية");
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("class_assignments").insert({
    ...parsed,
    assigned_by: session.profile.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/classes/${parsed.class_id}`);
}

export async function deleteSlot(formData: FormData) {
  await requireRole("admin");
  const id = z.coerce.number().int().positive().parse(formData.get("slot_id"));
  const classId = z.coerce.number().int().positive().parse(formData.get("class_id"));

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("class_assignments")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/classes/${classId}`);
}

export async function updateZoom(formData: FormData) {
  await requireRole("admin");
  const id = z.coerce.number().int().positive().parse(formData.get("slot_id"));
  const classId = z.coerce.number().int().positive().parse(formData.get("class_id"));
  const zoomLink = String(formData.get("zoom_link") ?? "");
  const zoomMeetingId = String(formData.get("zoom_meeting_id") ?? "");
  const zoomPasscode = String(formData.get("zoom_passcode") ?? "");

  if (zoomLink && !z.url().safeParse(zoomLink).success) {
    throw new Error("رابط Zoom غير صالح");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("class_assignments")
    .update({
      zoom_link: zoomLink || null,
      zoom_meeting_id: zoomMeetingId || null,
      zoom_passcode: zoomPasscode || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/classes/${classId}`);
}
