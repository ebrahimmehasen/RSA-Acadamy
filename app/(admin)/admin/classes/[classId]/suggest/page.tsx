import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { suggestDistribution } from "@/lib/distribution";
import { DAY_LABELS } from "@/lib/schedule";
import { CalendarCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createSlot } from "../actions";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

export default async function SuggestDistributionPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const id = Number(classId);
  if (!Number.isInteger(id)) notFound();

  const supabase = createAdminClient();
  const { data: cls } = await supabase
    .from("classes")
    .select("class_name")
    .eq("id", id)
    .single();
  if (!cls) notFound();

  const suggestions = await suggestDistribution(id);

  return (
    <PageShell>
      <PageHeader
        title={`اقتراح توزيع — ${cls.class_name}`}
        description="مقترحات بناءً على تفضيلات المدرسين وأوقات توافرهم — راجع واعتمد كل صف على حدة، فلا شيء يُحفظ تلقائيًا"
        backHref={`/admin/classes/${id}`}
        backLabel={`رجوع لـ ${cls.class_name}`}
        action={
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/admin/classes/${id}`}>الرجوع للجدول</Link>}
          />
        }
      />

      {suggestions.length === 0 && (
        <EmptyState
          icon={CalendarCheck}
          title="كل مواد هذا الفصل موزَّعة بالفعل ✅"
        />
      )}

      <div className="grid gap-[var(--card-gap)]">
        {suggestions.map((s) => (
          <Card key={s.subjectId}>
            <CardHeader>
              <CardTitle className="text-base">{s.subjectName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {s.teacherId && s.dayOfWeek && s.startTime && s.endTime ? (
                <>
                  <p className="text-sm">
                    <Badge variant="info">{s.teacherName}</Badge>{" "}
                    {DAY_LABELS[s.dayOfWeek]}{" "}
                    <span dir="ltr">
                      {s.startTime}–{s.endTime}
                    </span>
                  </p>
                  <form action={createSlot}>
                    <input type="hidden" name="class_id" value={id} />
                    <input type="hidden" name="subject_id" value={s.subjectId} />
                    <input type="hidden" name="teacher_id" value={s.teacherId} />
                    <input type="hidden" name="day_of_week" value={s.dayOfWeek} />
                    <input type="hidden" name="start_time" value={s.startTime} />
                    <input type="hidden" name="end_time" value={s.endTime} />
                    <input type="hidden" name="zoom_link" value="" />
                    <input type="hidden" name="zoom_meeting_id" value="" />
                    <input type="hidden" name="zoom_passcode" value="" />
                    <Button type="submit" size="sm">
                      اعتماد ✅
                    </Button>
                  </form>
                </>
              ) : (
                <p className="text-sm text-destructive">{s.note}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
