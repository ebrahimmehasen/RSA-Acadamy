import Link from "next/link";
import { UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageShell } from "@/components/shared/PageShell";
import { CARD_LINK_CLASS } from "@/lib/ui";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { LinkChildForm } from "./LinkChildForm";
import { studentBranchLabel } from "@/lib/subjects";

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
    <PageShell>
      <PageHeader title="الأبناء" />

      <LinkChildForm />

      <div className="grid gap-[var(--card-gap)] sm:grid-cols-2">
        {(children ?? []).map((child) => {
          const profile = child.profiles as unknown as { full_name: string };
          const cls = child.classes as unknown as { class_name: string };
          return (
            <Link
              key={child.user_id}
              href={`/parent/children/${child.user_id}`}
              className={CARD_LINK_CLASS}
            >
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader>
                  <CardTitle className="truncate text-base">
                    {profile?.full_name}
                  </CardTitle>
                  <CardDescription>
                    {cls?.class_name} ·{" "}
                    {studentBranchLabel(child.branch)} · كود:{" "}
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
          <EmptyState
            icon={UsersRound}
            title="لا يوجد أبناء مرتبطون بعد"
            description="استخدم كود الطالب أعلاه لربط ابنك"
            className="sm:col-span-2"
          />
        )}
      </div>
    </PageShell>
  );
}
