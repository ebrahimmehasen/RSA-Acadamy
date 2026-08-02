import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AnnouncementsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(50);

  // resolve viewer scope (class/branch/student-linked-parent) to filter client-side
  let myClassId: number | null = null;
  let myBranch: string | null = null;
  let myStudentIds: number[] = [];

  if (session.profile.role === "student") {
    const adminClient = createAdminClient();
    const { data: student } = await adminClient
      .from("students")
      .select("class_id, branch")
      .eq("user_id", session.profile.id)
      .single();
    myClassId = student?.class_id ?? null;
    myBranch = student?.branch ?? null;
    myStudentIds = [session.profile.id];
  } else if (session.profile.role === "parent") {
    const adminClient = createAdminClient();
    const { data: children } = await adminClient
      .from("students")
      .select("user_id")
      .eq("parent_id", session.profile.id);
    myStudentIds = (children ?? []).map((c) => c.user_id);
  }

  const relevant = (announcements ?? []).filter((a) => {
    if (a.target_type === "all") return true;
    if (a.target_type === "role") return a.target_role === session.profile.role;
    if (a.target_type === "class") return a.target_class_id === myClassId;
    if (a.target_type === "branch") return a.target_branch === myBranch;
    if (a.target_type === "student")
      return myStudentIds.includes(a.target_student_id ?? -1);
    return false;
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6" dir="rtl">
      <h1 className="text-2xl font-bold">الإعلانات</h1>
      <div className="grid gap-3">
        {relevant.map((a) => (
          <Card key={a.id}>
            <CardHeader>
              <CardTitle className="text-base">{a.title_ar}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="whitespace-pre-wrap">{a.content_ar}</p>
              <p className="text-xs text-muted-foreground" dir="ltr">
                {new Date(a.published_at).toLocaleString("ar-EG")}
              </p>
            </CardContent>
          </Card>
        ))}
        {relevant.length === 0 && (
          <p className="text-muted-foreground">مفيش إعلانات لسه</p>
        )}
      </div>
    </div>
  );
}
