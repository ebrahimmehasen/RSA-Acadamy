"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function togglePublished(formData: FormData) {
  await requireRole("admin");
  const id = z.coerce.number().int().parse(formData.get("session_id"));
  const published = formData.get("is_published") === "true";

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("recorded_sessions")
    .update({ is_published: !published })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/sessions");
}

export async function toggleArchived(formData: FormData) {
  await requireRole("admin");
  const id = z.coerce.number().int().parse(formData.get("session_id"));
  const archived = formData.get("is_archived") === "true";

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("recorded_sessions")
    .update({ is_archived: !archived })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/sessions");
}
