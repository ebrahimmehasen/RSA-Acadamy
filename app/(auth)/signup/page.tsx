import { createAdminClient } from "@/lib/supabase/admin";
import { SignUpForm } from "./SignUpForm";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const supabase = createAdminClient();
  const [{ data: classes }, { data: subjects }] = await Promise.all([
    supabase.from("classes").select("id, class_name").order("id"),
    supabase
      .from("subjects")
      .select("subject_id, subject_name, branch, class_id, classes(class_name)")
      .eq("is_active", true)
      .order("class_id"),
  ]);

  return (
    <SignUpForm
      classes={classes ?? []}
      subjects={(subjects ?? []).map((s) => ({
        subject_id: s.subject_id,
        subject_name: s.subject_name,
        branch: s.branch,
        class_name:
          (s.classes as unknown as { class_name: string } | null)?.class_name ??
          "—",
      }))}
    />
  );
}
