import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { AttachmentGallery, type GalleryFile } from "@/components/shared/AttachmentGallery";
import { submissionFilesOf } from "@/lib/submissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitForm } from "./SubmitForm";
import { DeleteSubmissionButton } from "./DeleteSubmissionButton";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { RealtimeRefresh } from "@/components/shared/RealtimeRefresh";

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const assignmentId = Number(id);
  if (!Number.isInteger(assignmentId)) notFound();

  const session = await getSession();
  const supabase = await createClient();

  const [{ data: assignment }, { data: submission }, { data: linkedQuiz }] =
    await Promise.all([
      supabase
        .from("assignments")
        .select("*, subjects(subject_name)")
        .eq("id", assignmentId)
        .maybeSingle(),
      supabase
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("student_id", session!.profile.id)
        .maybeSingle(),
      supabase
        .from("quizzes")
        .select("id, title, is_published")
        .eq("assignment_id", assignmentId)
        .eq("is_published", true)
        .maybeSingle(),
    ]);

  if (!assignment) notFound();

  const graded = submission?.status === "graded";

  // file_storage is admin-only under RLS. Safe here: the assignment (and
  // the student's own submission) were just fetched through the RLS-scoped
  // client, so these ids are already ones this student may see. Files are
  // still served only via the authenticated /api/files route.
  const attachmentIds = (assignment.attachment_drive_ids as string[] | null) ?? [];
  const submissionFiles = submission ? submissionFilesOf(submission) : [];
  const lookupIds = [...attachmentIds, ...submissionFiles.map((f) => f.id)];
  const fileMeta = new Map<
    string,
    { name: string; mimeType: string | null; sizeBytes: number | null }
  >();
  if (lookupIds.length > 0) {
    const { data: metaRows } = await createAdminClient()
      .from("file_storage")
      .select("drive_file_id, file_name, mime_type, file_size")
      .in("drive_file_id", lookupIds);
    for (const f of metaRows ?? []) {
      fileMeta.set(f.drive_file_id, {
        name: f.file_name,
        mimeType: f.mime_type,
        sizeBytes: f.file_size,
      });
    }
  }
  const toGalleryFile = (driveId: string, fallbackName: string): GalleryFile => ({
    url: `/api/files/${driveId}`,
    fileName: fileMeta.get(driveId)?.name ?? fallbackName,
    mimeType: fileMeta.get(driveId)?.mimeType ?? null,
    sizeBytes: fileMeta.get(driveId)?.sizeBytes ?? null,
  });
  const teacherFiles = attachmentIds.map((driveId, i) =>
    toGalleryFile(driveId, `مرفق ${i + 1}`),
  );

  return (
    <PageShell>
      <RealtimeRefresh
        channelName={`homework-detail:${assignmentId}:${session!.profile.id}`}
        watches={[
          {
            table: "assignment_submissions",
            filter: `assignment_id=eq.${assignmentId}`,
          },
        ]}
      />
      <PageHeader
        title={assignment.title}
        backHref="/student/homework"
        backLabel="رجوع للواجبات"
        description={`${(assignment.subjects as unknown as { subject_name: string })?.subject_name} · آخر موعد: ${new Date(
          assignment.due_date,
        ).toLocaleDateString("ar-EG", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        })} · الدرجة العظمى: ${assignment.max_grade}`}
      />

      {linkedQuiz && (
        <SectionCard title="اختبار مرتبط بهذا الواجب">
          <Button
            size="sm"
            render={
              <Link href={`/student/quizzes/${linkedQuiz.id}`}>
                ابدأ الاختبار: {linkedQuiz.title}
              </Link>
            }
          />
        </SectionCard>
      )}

      {assignment.description && (
        <SectionCard title="الوصف" contentClassName="whitespace-pre-wrap text-sm">
          {assignment.description}
        </SectionCard>
      )}

      {assignment.instructions && (
        <SectionCard title="التعليمات" contentClassName="whitespace-pre-wrap text-sm">
          {assignment.instructions}
        </SectionCard>
      )}

      {teacherFiles.length > 0 && (
        <SectionCard title={`مرفقات المدرس (${teacherFiles.length})`}>
          <AttachmentGallery files={teacherFiles} />
        </SectionCard>
      )}

      <SectionCard
        title="تسليمك"
        action={
          <>
            {graded && (
              <Badge variant="success">
                الدرجة: {submission!.grade}/{assignment.max_grade}
              </Badge>
            )}
            {submission?.is_late && (
              <Badge variant="destructive">تسليم متأخر</Badge>
            )}
          </>
        }
        contentClassName="space-y-4"
      >
          {submission && (
            <div className="space-y-2 rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">
                آخر تسليم:{" "}
                {new Date(submission.submitted_at).toLocaleString("ar-EG")}
              </p>
              {submissionFiles.length > 0 && (
                <AttachmentGallery
                  files={submissionFiles.map((f) => ({
                    ...toGalleryFile(f.id, f.name),
                    fileName: f.name,
                  }))}
                />
              )}
              {submission.text_answer && (
                <p className="whitespace-pre-wrap">{submission.text_answer}</p>
              )}
              {graded && submission.teacher_notes && (
                <div className="rounded-md bg-muted p-2">
                  <p className="font-medium">تعليق المدرس:</p>
                  <p className="whitespace-pre-wrap">{submission.teacher_notes}</p>
                </div>
              )}
            </div>
          )}

          {graded ? (
            <p className="text-sm text-muted-foreground">
              تم تصحيح حلك، ولا يمكن تعديله بعد ذلك.
            </p>
          ) : (
            <div className="space-y-2">
              {submission && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-heading text-sm font-semibold">تعديل حلّك</h3>
                  <DeleteSubmissionButton assignmentId={assignmentId} />
                </div>
              )}
              <SubmitForm
                key={submission?.submitted_at ?? "new"}
                assignmentId={assignmentId}
                allowFile={assignment.allow_file}
                allowText={assignment.allow_text}
                mode={submission ? "update" : "create"}
                defaultText={submission?.text_answer ?? ""}
                existingFiles={submissionFiles.map((f) => ({
                  id: f.id,
                  name: f.name,
                  mimeType: fileMeta.get(f.id)?.mimeType ?? null,
                  sizeBytes: fileMeta.get(f.id)?.sizeBytes ?? null,
                }))}
              />
            </div>
          )}
      </SectionCard>
    </PageShell>
  );
}
