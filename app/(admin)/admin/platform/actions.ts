"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function toggleAuthEnabled(formData: FormData) {
  await requireRole("admin");
  const enabled = formData.get("enabled") === "true";

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("platform_settings")
    .update({ auth_enabled: !enabled, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/platform");
  revalidatePath("/");
}
