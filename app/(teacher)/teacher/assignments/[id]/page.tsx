import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { GradeForm } from "./GradeForm";
import { ConfirmDeleteButton } from "@/components/shared/ConfirmDeleteButton";
import { deleteAssignment } from "../actions";
import { submissionFilesOf } from "@/lib/submissions";
import { EditAssignmentForm } from "./EditAssignmentForm";
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
    url: `/api/files/${f.drive_file_id}`,
    fileName: f.file_name,
    mimeType: f.mime_type,
    sizeBytes: f.file_size,
  }));
  const existingAttachmentsForEdit = (attachmentRows ?? []).map((f) => ({
    driveId: f.drive_file_id,
    fileName: f.file_name,
    mimeType: f.mime_type,
    sizeBytes: f.file_size,
  }));

  const isOpenForEdits = new Date(assignment.due_date) > new Date();

  // assignment_submissions has no mime_type/size of its own — resolve
  // those from file_storage (matched by the unique drive_file_id) so
  // submitted files can get a real preview instead of a plain link.
  const submissionFileIds = (submissions ?? []).flatMap((s) =>
    submissionFilesOf(s).map((f) => f.id),
  );
  const submissionFileMeta = new Map<
    string,
    { mimeType: string | null; sizeBytes: number | null }
  >();
  if (submissionFileIds.length > 0) {
    const { data: submissionFileRows } = await createAdminClient()
      .from("file_storage")
      .select("drive_file_id, mime_type, file_size")
      .in("drive_file_id", submissionFileIds);
    for (const f of submissionFileRows ?? []) {
      submissionFileMeta.set(f.drive_file_id, {
        mimeType: f.mime_type,
        sizeBytes: f.file_size,
      });
    }
  }

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
        action={
          <ConfirmDeleteButton
            action={deleteAssignment}
            hiddenFields={{ assignment_id: assignment.id }}
            label="حذف الواجب"
            confirmMessage={
              `هل أنت متأكد من حذف الواجب «${assignment.title}» نهائيًا؟` +
              ((submissions ?? []).length > 0
                ? ` سيتم حذف ${(submissions ?? []).length} تسليم من الطلاب معه` +
                  ((submissions ?? []).some((s) => s.status === "graded")
                    ? ` (منها ${(submissions ?? []).filter((s) => s.status === "graded").length} تم تصحيحه بدرجاته)`
                    : "") +
                  "."
                : "") +
              " لا يمكن التراجع عن هذا الإجراء."
            }
          />
        }
        description={`${(assignment.classes as unknown as { class_name: string })?.class_name} · ${(assignment.subjects as unknown as { subject_name: string })?.subject_name} · الدرجة العظمى: ${assignment.max_grade}`}
      />

      {isOpenForEdits ? (
        <EditAssignmentForm
          assignment={{
            id: assignment.id,
            title: assignment.title,
            description: assignment.description,
            instructions: assignment.instructions,
            dueDateIso: assignment.due_date,
            maxGrade: assignment.max_grade,
            allowFile: assignment.allow_file,
            allowText: assignment.allow_text,
          }}
          existingAttachments={existingAttachmentsForEdit}
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          انتهى موعد التسليم — لا يمكن تعديل الواجب
        </p>
      )}

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
                {submissionFilesOf(s).length > 0 && (
                  <FilePreviewGrid
                    files={submissionFilesOf(s).map((f) => ({
                      url: `/api/files/${f.id}`,
                      fileName: f.name,
                      mimeType: submissionFileMeta.get(f.id)?.mimeType ?? null,
                      sizeBytes: submissionFileMeta.get(f.id)?.sizeBytes ?? null,
                    }))}
                  />
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
