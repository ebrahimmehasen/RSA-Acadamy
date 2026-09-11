"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAYS, PERIODS } from "@/lib/schedule";

export interface PreferencesResult {
  ok: boolean;
  message: string;
}

/** Subjects the teacher can teach + the classes they'd prefer. */
export async function savePreferences(
  _prev: PreferencesResult | null,
  formData: FormData,
): Promise<PreferencesResult> {
  try {
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
    return { ok: true, message: "تم حفظ التفضيلات بنجاح" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "حدث خطأ أثناء الحفظ",
    };
  }
}

const periodStarts = new Set<string>(PERIODS.map((p) => p.start));

/**
 * Replaces the teacher's whole weekly availability in one go — the
 * form is a day×period checkbox grid, not one-slot-at-a-time, so
 * "save" always means "this is the complete set now" rather than an
 * incremental insert that could collide with an existing row.
 */
export async function saveAvailability(
  _prev: PreferencesResult | null,
  formData: FormData,
): Promise<PreferencesResult> {
  try {
    const session = await requireRole("teacher");
    const raw = formData.getAll("slots") as string[];

    const slotSchema = z.object({
      day: z.enum(DAYS),
      start: z.string().refine((s) => periodStarts.has(s)),
    });
    const parsed = raw
      .map((value) => {
        const [day, start] = value.split("|");
        const result = slotSchema.safeParse({ day, start });
        return result.success ? result.data : null;
      })
      .filter((v): v is { day: (typeof DAYS)[number]; start: string } => v !== null);

    const rows = parsed.map(({ day, start }) => {
      const period = PERIODS.find((p) => p.start === start)!;
      return {
        teacher_id: session.profile.id,
        day_of_week: day,
        start_time: period.start,
        end_time: period.end,
      };
    });

    const supabase = createAdminClient();
    const { error: deleteError } = await supabase
      .from("teacher_availability")
      .delete()
      .eq("teacher_id", session.profile.id);
    if (deleteError) throw new Error(deleteError.message);

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from("teacher_availability")
        .insert(rows);
      if (insertError) throw new Error(insertError.message);
    }

    revalidatePath("/teacher/preferences");
    return { ok: true, message: "تم حفظ أوقات التواجد بنجاح" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "حدث خطأ أثناء الحفظ",
    };
  }
}
