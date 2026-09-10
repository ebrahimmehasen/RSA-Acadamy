import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { VideoTracker } from "./VideoTracker";
import { RatingForm } from "./RatingForm";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";

export default async function StudentSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId)) notFound();

  const session = await getSession();
  const supabase = await createClient();

  const { data: recordedSession } = await supabase
    .from("recorded_sessions")
    .select("*, subjects(subject_name)")
    .eq("id", sessionId)
    .eq("is_published", true)
    .maybeSingle();
  if (!recordedSession) notFound();

  const { data: myRating } = await supabase
    .from("session_ratings")
    .select("rating, review")
    .eq("session_id", sessionId)
    .eq("student_id", session!.profile.id)
    .maybeSingle();

  return (
    <PageShell>
      <PageHeader
        title={recordedSession.title}
        backHref="/student/sessions"
        backLabel="رجوع للحصص المسجلة"
        description={`${
          (recordedSession.subjects as unknown as { subject_name: string })
            ?.subject_name
        } · ${new Date(recordedSession.session_date).toLocaleDateString("ar-EG")}${
          recordedSession.rating_count > 0
            ? ` · ⭐ ${recordedSession.total_rating} (${recordedSession.rating_count})`
            : ""
        }`}
      />

      <VideoTracker sessionId={sessionId} driveId={recordedSession.video_drive_id} />

      <Button
        variant="outline"
        size="sm"
        render={
          <a
            href={`/api/files/${recordedSession.video_drive_id}`}
            download={`${recordedSession.title}.mp4`}
          >
            تحميل الفيديو 📥
          </a>
        }
      />

      {recordedSession.description && (
        <p className="whitespace-pre-wrap text-sm">{recordedSession.description}</p>
      )}

      <SectionCard title="شاركنا رأيك في الحصة">
        <RatingForm
          sessionId={sessionId}
          currentRating={myRating?.rating ?? null}
          currentReview={myRating?.review ?? null}
        />
      </SectionCard>
    </PageShell>
  );
}
