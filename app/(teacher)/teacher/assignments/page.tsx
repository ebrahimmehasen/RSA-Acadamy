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
import { CreateAssignmentForm } from "./CreateAssignmentForm";

export default async function TeacherAssignmentsPage() {
  const session = await getSession();
  const supabase = await createClient();

  const [{ data: slots }, { data: assignments }, { data: submissions }] =
    await Promise.all([
      supabase
        .from("class_assignments")
        .select("class_id, subject_id, classes(class_name), subjects(subject_name)")
        .eq("teacher_id", session!.profile.id)
        .eq("is_active", true),
      supabase
        .from("assignments")
        .select("id, title, due_date, max_grade, classes(class_name), subjects(subject_name)")
        .eq("teacher_id", session!.profile.id)
        .order("due_date", { ascending: false }),
      supabase
        .from("assignment_submissions")
        .select("assignment_id, status"),
    ]);

  // dedupe class+subject combos this teacher actually teaches
  const seen = new Set<string>();
  const uniqueSlots = (slots ?? [])
    .filter((s) => {
      const key = `${s.class_id}|${s.subject_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((s) => ({
      classId: s.class_id,
      className: (s.classes as unknown as { class_name: string })?.class_name,
      subjectId: s.subject_id,
      subjectName: (s.subjects as unknown as { subject_name: string })?.subject_name,
    }));

  const pendingCountByAssignment = new Map<number, number>();
  for (const sub of submissions ?? []) {
    if (sub.status === "submitted") {
      pendingCountByAssignment.set(
        sub.assignment_id,
        (pendingCountByAssignment.get(sub.assignment_id) ?? 0) + 1,
      );
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الواجبات</h1>

      <CreateAssignmentForm slots={uniqueSlots} />

      <div className="grid gap-3">
        {(assignments ?? []).map((a) => (
          <Link key={a.id} href={`/teacher/assignments/${a.id}`}>
            <Card className="transition-colors hover:bg-accent">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{a.title}</CardTitle>
                  {(pendingCountByAssignment.get(a.id) ?? 0) > 0 && (
                    <Badge>
                      {pendingCountByAssignment.get(a.id)} بانتظار التصحيح
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {(a.classes as unknown as { class_name: string })?.class_name}
                {" · "}
                {(a.subjects as unknown as { subject_name: string })?.subject_name}
                {" · آخر موعد: "}
                {new Date(a.due_date).toLocaleDateString("ar-EG")}
              </CardContent>
            </Card>
          </Link>
        ))}
        {(assignments ?? []).length === 0 && (
          <p className="text-muted-foreground">مفيش واجبات لسه</p>
        )}
      </div>
    </div>
  );
}
