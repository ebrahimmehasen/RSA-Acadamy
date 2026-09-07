"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  label: z.string().min(2),
  link: z.url(),
  meeting_id: z.string().transform((v) => v || null),
  passcode: z.string().transform((v) => v || null),
});

export async function addZoomAccount(formData: FormData) {
  await requireRole("admin");
  const parsed = schema.parse({
    label: formData.get("label"),
    link: formData.get("link"),
    meeting_id: formData.get("meeting_id") ?? "",
    passcode: formData.get("passcode") ?? "",
  });

  const supabase = createAdminClient();
  const { error } = await supabase.from("zoom_accounts").insert(parsed);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/zoom-accounts");
}

export async function deleteZoomAccount(formData: FormData) {
  await requireRole("admin");
  const id = z.coerce.number().int().positive().parse(formData.get("id"));

  const supabase = createAdminClient();
  const { error } = await supabase.from("zoom_accounts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/zoom-accounts");
}
