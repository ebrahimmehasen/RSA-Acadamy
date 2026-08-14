import { createAdminClient } from "@/lib/supabase/admin";

export type AdminLogTargetType = "student" | "teacher" | "parent";

/** Records an admin's edit for the audit log shown on that person's detail page. */
export async function logAdminEdit(options: {
  adminId: number;
  adminName: string;
  targetType: AdminLogTargetType;
  targetId: number;
  description: string;
}): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("admin_edit_log").insert({
    admin_id: options.adminId,
    admin_name: options.adminName,
    target_type: options.targetType,
    target_id: options.targetId,
    description: options.description,
  });
}
