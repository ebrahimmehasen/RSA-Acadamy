import { createAdminClient } from "@/lib/supabase/admin";
import { SignUpForm } from "./SignUpForm";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const supabase = createAdminClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, class_name")
    .order("id");

  return <SignUpForm classes={classes ?? []} />;
}
