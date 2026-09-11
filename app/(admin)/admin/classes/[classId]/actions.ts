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
  timing_mode: z.enum(["period", "custom"]).default("period"),
  period: z.string().optional(),
  custom_start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  custom_end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  zoom_account_id: z.coerce.number().int().positive().nullable(),
  // set = a private lesson for exactly this one student, not the class
  student_id: z.coerce.number().int().positive().nullable(),
});

export async function createSlot(formData: FormData) {
  const session = await requireRole("admin");

  const parsed = slotSchema.parse({
    class_id: formData.get("class_id"),
    subject_id: formData.get("subject_id"),
    teacher_id: formData.get("teacher_id") || null,
    day_of_week: formData.get("day_of_week"),
    timing_mode: formData.get("timing_mode") || "period",
    period: formData.get("period") || undefined,
    custom_start_time: formData.get("custom_start_time") || undefined,
    custom_end_time: formData.get("custom_end_time") || undefined,
    zoom_account_id: formData.get("zoom_account_id") || null,
    student_id: formData.get("student_id") || null,
  });

  let slot: { start: string; end: string };
  if (parsed.timing_mode === "custom") {
    if (!parsed.custom_start_time || !parsed.custom_end_time) {
      throw new Error("حدِّد وقت البداية والنهاية للموعد المختلف");
    }
    if (parsed.custom_end_time <= parsed.custom_start_time) {
      throw new Error("يجب أن يكون وقت النهاية بعد وقت البداية");
    }
    slot = { start: parsed.custom_start_time, end: parsed.custom_end_time };
  } else {
    const period = parsed.period ? parsePeriod(parsed.period) : null;
    if (!period) throw new Error("الحصة المختارة غير صحيحة");
    slot = period;
  }

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
    student_id: parsed.student_id,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/classes/${parsed.class_id}`);
}

const updateSlotSchema = slotSchema.extend({
  id: z.coerce.number().int().positive(),
  // "" = keep the slot's current Zoom info untouched, "none" = clear it,
  // otherwise a zoom_accounts id to copy from — same tri-state the edit
  // form exposes, since a blank <select> can't distinguish "unchanged"
  // from "explicitly cleared" the way createSlot's plain nullable does.
  zoom_account_id: z.union([z.literal("keep"), z.literal("none"), z.coerce.number().int().positive()]),
});

export async function updateSlot(formData: FormData) {
  const session = await requireRole("admin");

  const rawZoom = formData.get("zoom_account_id");
  const parsed = updateSlotSchema.parse({
    id: formData.get("id"),
    class_id: formData.get("class_id"),
    subject_id: formData.get("subject_id"),
    teacher_id: formData.get("teacher_id") || null,
    day_of_week: formData.get("day_of_week"),
    timing_mode: formData.get("timing_mode") || "period",
    period: formData.get("period") || undefined,
    custom_start_time: formData.get("custom_start_time") || undefined,
    custom_end_time: formData.get("custom_end_time") || undefined,
    zoom_account_id: rawZoom === "keep" || rawZoom === "none" ? rawZoom : rawZoom || "keep",
    student_id: formData.get("student_id") || null,
  });

  let slot: { start: string; end: string };
  if (parsed.timing_mode === "custom") {
    if (!parsed.custom_start_time || !parsed.custom_end_time) {
      throw new Error("حدِّد وقت البداية والنهاية للموعد المختلف");
    }
    if (parsed.custom_end_time <= parsed.custom_start_time) {
      throw new Error("يجب أن يكون وقت النهاية بعد وقت البداية");
    }
    slot = { start: parsed.custom_start_time, end: parsed.custom_end_time };
  } else {
    const period = parsed.period ? parsePeriod(parsed.period) : null;
    if (!period) throw new Error("الحصة المختارة غير صحيحة");
    slot = period;
  }

  const supabase = createAdminClient();

  const update: Record<string, unknown> = {
    class_id: parsed.class_id,
    subject_id: parsed.subject_id,
    teacher_id: parsed.teacher_id,
    day_of_week: parsed.day_of_week,
    start_time: slot.start,
    end_time: slot.end,
    assigned_by: session.profile.id,
    student_id: parsed.student_id,
  };

  if (parsed.zoom_account_id === "none") {
    update.zoom_link = null;
    update.zoom_meeting_id = null;
    update.zoom_passcode = null;
  } else if (parsed.zoom_account_id !== "keep") {
    const { data: account } = await supabase
      .from("zoom_accounts")
      .select("link, meeting_id, passcode")
      .eq("id", parsed.zoom_account_id)
      .maybeSingle();
    if (!account) throw new Error("حساب Zoom غير موجود");
    update.zoom_link = account.link;
    update.zoom_meeting_id = account.meeting_id;
    update.zoom_passcode = account.passcode;
  }

  const { error } = await supabase
    .from("class_assignments")
    .update(update)
    .eq("id", parsed.id);
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
