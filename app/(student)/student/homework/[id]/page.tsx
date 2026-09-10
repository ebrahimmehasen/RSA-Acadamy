import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitForm } from "./SubmitForm";
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

      {(assignment.attachment_drive_ids as string[])?.length > 0 && (
        <SectionCard title="مرفقات المدرس" contentClassName="flex flex-wrap gap-2">
          {(assignment.attachment_drive_ids as string[]).map((driveId, index) => (
            <a
              key={driveId}
              href={`/api/files/${driveId}`}
              target="_blank"
              className="text-sm text-primary underline underline-offset-4"
            >
              مرفق {index + 1}
            </a>
          ))}
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
              {submission.file_drive_id && (
                <p>
                  الملف:{" "}
                  <a
                    href={`/api/files/${submission.file_drive_id}`}
                    target="_blank"
                    className="text-primary underline underline-offset-4"
                  >
                    {submission.file_name ?? "عرض الملف"}
                  </a>
                </p>
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

          {!graded && (
            <SubmitForm
              assignmentId={assignmentId}
              allowFile={assignment.allow_file}
              allowText={assignment.allow_text}
            />
          )}
      </SectionCard>
    </PageShell>
  );
}
