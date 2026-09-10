import Link from "next/link";
import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { RealtimeRefresh } from "@/components/shared/RealtimeRefresh";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function StudentHomeworkPage() {
  const session = await getSession();
  const supabase = await createClient();

  const { data: studentRow } = await supabase
    .from("students")
    .select("class_id")
    .eq("user_id", session!.profile.id)
    .maybeSingle();

  const [{ data: assignments }, { data: submissions }] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, due_date, max_grade, subject_id, subjects(subject_name)")
      .order("due_date", { ascending: false }),
    supabase
      .from("assignment_submissions")
      .select("assignment_id, status, grade, is_late")
      .eq("student_id", session!.profile.id),
  ]);

  const submissionByAssignment = new Map(
    (submissions ?? []).map((s) => [s.assignment_id, s]),
  );

  return (
    <PageShell>
      <RealtimeRefresh
        channelName={`homework:${session!.profile.id}`}
        watches={[
          ...(studentRow?.class_id
            ? [{ table: "assignments", filter: `class_id=eq.${studentRow.class_id}` }]
            : []),
          { table: "assignment_submissions", filter: `student_id=eq.${session!.profile.id}` },
        ]}
      />
      <PageHeader title="الواجبات" />
      {(assignments ?? []).length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="لا توجد واجبات حتى الآن"
          description="استمتع بوقتك الحر!"
        />
      )}
      <div className="grid gap-[var(--card-gap)]">
        {(assignments ?? []).map((a) => {
          const submission = submissionByAssignment.get(a.id);
          const overdue = !submission && new Date(a.due_date) < new Date();
          return (
            <Link
              key={a.id}
              href={`/student/homework/${a.id}`}
              className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Card className="transition-colors hover:bg-muted/40">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="min-w-0 truncate text-base">{a.title}</CardTitle>
                    {submission?.status === "graded" ? (
                      <Badge variant="success">
                        الدرجة: {submission.grade}/{a.max_grade}
                      </Badge>
                    ) : submission ? (
                      <Badge variant="secondary">
                        تم التسليم{submission.is_late ? " (متأخر)" : ""}
                      </Badge>
                    ) : overdue ? (
                      <Badge variant="destructive">متأخر — لم يُسلَّم</Badge>
                    ) : (
                      <Badge variant="outline">مطلوب</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {(a.subjects as unknown as { subject_name: string })?.subject_name}
                  {" · "}
                  آخر موعد:{" "}
                  {new Date(a.due_date).toLocaleDateString("ar-EG", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}
