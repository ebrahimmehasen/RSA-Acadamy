import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { suggestDistribution } from "@/lib/distribution";
import { DAY_LABELS } from "@/lib/schedule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createSlot } from "../actions";
import { BackLink } from "@/components/shared/BackLink";

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
    <div className="space-y-6">
      <BackLink href={`/admin/classes/${id}`} label={`رجوع لـ ${cls.class_name}`} />
      <div>
        <h1 className="text-2xl font-bold">اقتراح توزيع — {cls.class_name}</h1>
        <CardDescription>
          مقترحات بناءً على تفضيلات المدرسين وأوقات توافرهم — راجع واعتمد كل
          صف على حدة، مفيش حاجة بتتحفظ تلقائيًا
        </CardDescription>
      </div>

      <Button variant="outline" size="sm" render={<Link href={`/admin/classes/${id}`}>الرجوع للجدول</Link>} />

      {suggestions.length === 0 && (
        <p className="text-muted-foreground">
          كل مواد الفصل ده متوزعة بالفعل ✅
        </p>
      )}

      <div className="grid gap-3">
        {suggestions.map((s) => (
          <Card key={s.subjectId}>
            <CardHeader>
              <CardTitle className="text-base">{s.subjectName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {s.teacherId && s.dayOfWeek && s.startTime && s.endTime ? (
                <>
                  <p className="text-sm">
                    <Badge>{s.teacherName}</Badge>{" "}
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
    </div>
  );
}
