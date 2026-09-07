"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAYS, parsePeriod } from "@/lib/schedule";

const slotSchema = z.object({
  class_id: z.coerce.number().int().positive(),
  subject_id: z.string().min(1),
  teacher_id: z.coerce.number().int().positive().nullable(),
  day_of_week: z.enum(DAYS),
  period: z.string(),
  zoom_account_id: z.coerce.number().int().positive().nullable(),
});

export async function createSlot(formData: FormData) {
  const session = await requireRole("admin");

  const parsed = slotSchema.parse({
    class_id: formData.get("class_id"),
    subject_id: formData.get("subject_id"),
    teacher_id: formData.get("teacher_id") || null,
    day_of_week: formData.get("day_of_week"),
    period: formData.get("period"),
    zoom_account_id: formData.get("zoom_account_id") || null,
  });

  const slot = parsePeriod(parsed.period);
  if (!slot) throw new Error("الحصة المختارة غير صحيحة");

  const supabase = createAdminClient();

  let zoomLink: string | null = null;
  let zoomMeetingId: string | null = null;
  let zoomPasscode: string | null = null;
  if (parsed.zoom_account_id) {
    const { data: account } = await supabase
      .from("zoom_accounts")
      .select("link, meeting_id, passcode")
      .eq("id", parsed.zoom_account_id)
      .maybeSingle();
    if (!account) throw new Error("حساب Zoom غير موجود");
    zoomLink = account.link;
    zoomMeetingId = account.meeting_id;
    zoomPasscode = account.passcode;
  }

  const { error } = await supabase.from("class_assignments").insert({
    class_id: parsed.class_id,
    subject_id: parsed.subject_id,
    teacher_id: parsed.teacher_id,
    day_of_week: parsed.day_of_week,
    start_time: slot.start,
    end_time: slot.end,
    zoom_link: zoomLink,
    zoom_meeting_id: zoomMeetingId,
    zoom_passcode: zoomPasscode,
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
