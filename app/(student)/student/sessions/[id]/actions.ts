"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function recordView(formData: FormData) {
  const session = await requireRole("student");
  const sessionId = z.coerce.number().int().positive().parse(formData.get("session_id"));
  const percentage = z.coerce.number().min(0).max(100).parse(formData.get("watch_percentage"));

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("session_views")
    .select("id, watch_percentage")
    .eq("session_id", sessionId)
    .eq("student_id", session.profile.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from("session_views").insert({
      session_id: sessionId,
      student_id: session.profile.id,
      watch_percentage: percentage,
      watch_duration: 0,
    });

    const { data: current } = await supabase
      .from("recorded_sessions")
      .select("view_count")
      .eq("id", sessionId)
      .single();
    await supabase
      .from("recorded_sessions")
      .update({ view_count: (current?.view_count ?? 0) + 1 })
      .eq("id", sessionId);
  } else if (percentage > existing.watch_percentage) {
    await supabase
      .from("session_views")
      .update({ watch_percentage: percentage, watched_at: new Date().toISOString() })
      .eq("id", existing.id);
  }

  revalidatePath(`/student/sessions/${sessionId}`);
}

export async function rateSession(formData: FormData) {
  const session = await requireRole("student");
  const sessionId = z.coerce.number().int().positive().parse(formData.get("session_id"));
  const rating = z.coerce.number().int().min(1).max(5).parse(formData.get("rating"));
  const review = String(formData.get("review") ?? "").trim();

  const supabase = createAdminClient();
  const { error } = await supabase.from("session_ratings").upsert(
    {
      session_id: sessionId,
      student_id: session.profile.id,
      rating,
      review: review || null,
    },
    { onConflict: "session_id,student_id" },
  );
  if (error) throw new Error(error.message);

  revalidatePath(`/student/sessions/${sessionId}`);
}
