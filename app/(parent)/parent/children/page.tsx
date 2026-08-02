import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LinkChildForm } from "./LinkChildForm";

export default async function ParentChildrenPage() {
  const session = await getSession();
  const supabase = await createClient();

  const { data: children } = await supabase
    .from("students")
    .select(
      "user_id, student_code, branch, is_active, classes(class_name), profiles!students_user_id_fkey(full_name)",
    )
    .eq("parent_id", session!.profile.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الأبناء</h1>

      <LinkChildForm />

      <div className="grid gap-3 sm:grid-cols-2">
        {(children ?? []).map((child) => {
          const profile = child.profiles as unknown as { full_name: string };
          const cls = child.classes as unknown as { class_name: string };
          return (
            <Link key={child.user_id} href={`/parent/children/${child.user_id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader>
                  <CardTitle className="text-base">
                    {profile?.full_name}
                  </CardTitle>
                  <CardDescription>
                    {cls?.class_name} ·{" "}
                    {child.branch === "Arabic" ? "عربي" : "لغات"} · كود:{" "}
                    <span dir="ltr" className="font-mono">
                      {child.student_code}
                    </span>
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
        {(children ?? []).length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              مفيش أبناء مربوطين لسه — استخدم كود الطالب فوق
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
