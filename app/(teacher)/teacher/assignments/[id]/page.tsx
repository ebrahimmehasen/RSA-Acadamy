import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GradeForm } from "./GradeForm";
import { BackLink } from "@/components/shared/BackLink";

export default async function TeacherAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const assignmentId = Number(id);
  if (!Number.isInteger(assignmentId)) notFound();

  const session = await getSession();
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from("assignments")
    .select("*, classes(class_name), subjects(subject_name)")
    .eq("id", assignmentId)
    .eq("teacher_id", session!.profile.id)
    .maybeSingle();
  if (!assignment) notFound();

  const { data: submissions } = await supabase
    .from("assignment_submissions")
    .select(
      "*, students!assignment_submissions_student_id_fkey(student_code, profiles!students_user_id_fkey(full_name))",
    )
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: false });

  return (
    <div className="space-y-6">
      <BackLink href="/teacher/assignments" label="رجوع للواجبات" />
      <div>
        <h1 className="text-2xl font-bold">{assignment.title}</h1>
        <p className="text-muted-foreground">
          {(assignment.classes as unknown as { class_name: string })?.class_name}
          {" · "}
          {(assignment.subjects as unknown as { subject_name: string })?.subject_name}
          {" · الدرجة العظمى: "}
          {assignment.max_grade}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            التسليمات ({(submissions ?? []).length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(submissions ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              مفيش تسليمات لسه
            </p>
          )}
          {(submissions ?? []).map((s) => {
            const student = s.students as unknown as {
              student_code: string;
              profiles: { full_name: string };
            };
            return (
              <div key={s.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {student?.profiles?.full_name}{" "}
                    <span className="font-mono text-muted-foreground" dir="ltr">
                      ({student?.student_code})
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    {s.is_late && <Badge variant="destructive">متأخر</Badge>}
                    {s.status === "graded" ? (
                      <Badge>{s.grade}/{assignment.max_grade}</Badge>
                    ) : (
                      <Badge variant="secondary">بانتظار التصحيح</Badge>
                    )}
                  </div>
                </div>
                {s.file_drive_id && (
                  <a
                    href={`/api/files/${s.file_drive_id}`}
                    target="_blank"
                    className="block text-sm text-primary underline underline-offset-4"
                  >
                    {s.file_name ?? "عرض الملف"}
                  </a>
                )}
                {s.text_answer && (
                  <p className="whitespace-pre-wrap rounded-md bg-muted p-2 text-sm">
                    {s.text_answer}
                  </p>
                )}
                <GradeForm
                  submissionId={s.id}
                  assignmentId={assignmentId}
                  maxGrade={assignment.max_grade}
                  currentGrade={s.grade}
                  currentNotes={s.teacher_notes}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
