import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { GradeForm } from "./GradeForm";
import { FilePreviewGrid, type FileAttachment } from "../FilePreview";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { RealtimeRefresh } from "@/components/shared/RealtimeRefresh";

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

  // file_storage is admin-only under RLS — safe to read here with the
  // admin client since we've already confirmed above that this
  // assignment belongs to the signed-in teacher.
  const { data: attachmentRows } = await createAdminClient()
    .from("file_storage")
    .select("drive_file_id, file_name, mime_type, file_size")
    .eq("entity_type", "teacher_attachment")
    .eq("entity_id", String(assignmentId))
    .is("deleted_at", null)
    .order("uploaded_at");
  const attachments: FileAttachment[] = (attachmentRows ?? []).map((f) => ({
    id: f.drive_file_id,
    fileName: f.file_name,
    mimeType: f.mime_type,
    sizeBytes: f.file_size,
  }));

  return (
    <PageShell>
      <RealtimeRefresh
        channelName={`assignment-detail:${assignmentId}`}
        watches={[
          { table: "assignment_submissions", filter: `assignment_id=eq.${assignmentId}` },
        ]}
      />
      <PageHeader
        title={assignment.title}
        backHref="/teacher/assignments"
        backLabel="رجوع للواجبات"
        description={`${(assignment.classes as unknown as { class_name: string })?.class_name} · ${(assignment.subjects as unknown as { subject_name: string })?.subject_name} · الدرجة العظمى: ${assignment.max_grade}`}
      />

      {attachments.length > 0 && (
        <SectionCard title={`مرفقات الواجب (${attachments.length})`}>
          <FilePreviewGrid files={attachments} />
        </SectionCard>
      )}

      <SectionCard
        title={`التسليمات (${(submissions ?? []).length})`}
        contentClassName="space-y-4"
      >
          {(submissions ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              لا توجد تسليمات بعد
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
                      <Badge variant="success">{s.grade}/{assignment.max_grade}</Badge>
                    ) : (
                      <Badge variant="warning">بانتظار التصحيح</Badge>
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
      </SectionCard>
    </PageShell>
  );
}
