import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function StudentHomeworkPage() {
  const session = await getSession();
  const supabase = await createClient();

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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الواجبات</h1>
      {(assignments ?? []).length === 0 && (
        <p className="text-muted-foreground">مفيش واجبات لحد دلوقتي.</p>
      )}
      <div className="grid gap-3">
        {(assignments ?? []).map((a) => {
          const submission = submissionByAssignment.get(a.id);
          const overdue = !submission && new Date(a.due_date) < new Date();
          return (
            <Link key={a.id} href={`/student/homework/${a.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    {submission?.status === "graded" ? (
                      <Badge>
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
    </div>
  );
}
