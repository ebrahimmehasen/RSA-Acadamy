"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAYS } from "@/lib/schedule";

export async function savePreferences(formData: FormData) {
  const session = await requireRole("teacher");
  const subjectCodes = formData.getAll("subjects") as string[];
  const classIds = formData.getAll("classes").map(Number);

  const supabase = createAdminClient();
  const { error } = await supabase.from("teacher_preferences").upsert(
    {
      teacher_id: session.profile.id,
      subjects: subjectCodes,
      classes: classIds,
    },
    { onConflict: "teacher_id" },
  );
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/preferences");
}

const slotSchema = z.object({
  day_of_week: z.enum(DAYS),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function addAvailability(formData: FormData) {
  const session = await requireRole("teacher");
  const parsed = slotSchema.parse({
    day_of_week: formData.get("day_of_week"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
  });
  if (parsed.end_time <= parsed.start_time) {
    throw new Error("وقت النهاية لازم يكون بعد وقت البداية");
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("teacher_availability").insert({
    teacher_id: session.profile.id,
    ...parsed,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/preferences");
}

export async function removeAvailability(formData: FormData) {
  const session = await requireRole("teacher");
  const id = z.coerce.number().int().parse(formData.get("slot_id"));

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("teacher_availability")
    .delete()
    .eq("id", id)
    .eq("teacher_id", session.profile.id);
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/preferences");
}
