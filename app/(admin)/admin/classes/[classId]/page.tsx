import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DAYS,
  DAY_LABELS,
  formatTime,
  type ScheduleSlot,
} from "@/lib/schedule";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { createSlot, deleteSlot } from "./actions";
import { AddSlotForm } from "./AddSlotForm";

export default async function AdminClassSchedulePage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const id = Number(classId);
  if (!Number.isInteger(id)) notFound();

  const supabase = createAdminClient();

  const [{ data: cls }, { data: slots }, { data: subjects }, { data: teachers }] =
    await Promise.all([
      supabase.from("classes").select("*").eq("id", id).single(),
      supabase
        .from("class_assignments")
        .select("*")
        .eq("class_id", id)
        .order("day_of_week")
        .order("start_time"),
      supabase
        .from("subjects")
        .select("subject_id, subject_name, branch")
        .eq("class_id", id)
        .eq("is_active", true)
        .order("branch")
        .order("subject_name"),
      supabase
        .from("teachers")
        .select("user_id, profiles!inner(full_name)")
        .eq("is_active", true),
    ]);

  if (!cls) notFound();

  const teacherOptions = (teachers ?? []).map((t) => ({
    id: t.user_id as number,
    name:
      (t.profiles as unknown as { full_name: string })?.full_name ??
      `مدرس #${t.user_id}`,
  }));
  const teacherNameById = new Map(teacherOptions.map((t) => [t.id, t.name]));
  const subjectNameById = new Map(
    (subjects ?? []).map((s) => [s.subject_id, `${s.subject_name} (${s.branch === "Arabic" ? "عربي" : "لغات"})`]),
  );

  const typedSlots = (slots ?? []) as ScheduleSlot[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{cls.class_name}</h1>
          <p className="text-muted-foreground">الجدول الأسبوعي وروابط Zoom</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/admin/classes/${id}/suggest`}>اقتراح توزيع 🪄</Link>}
        />
      </div>

      {DAYS.map((day) => {
        const daySlots = typedSlots.filter((s) => s.day_of_week === day);
        if (daySlots.length === 0) return null;
        return (
          <Card key={day}>
            <CardHeader>
              <CardTitle className="text-lg">{DAY_LABELS[day]}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المادة</TableHead>
                    <TableHead className="text-right">المدرس</TableHead>
                    <TableHead className="text-right">الوقت</TableHead>
                    <TableHead className="text-right">Zoom</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daySlots.map((slot) => (
                    <TableRow key={slot.id}>
                      <TableCell>
                        {subjectNameById.get(slot.subject_id) ?? slot.subject_id}
                      </TableCell>
                      <TableCell>
                        {slot.teacher_id
                          ? teacherNameById.get(slot.teacher_id) ?? "—"
                          : "غير محدد"}
                      </TableCell>
                      <TableCell dir="ltr" className="text-right">
                        {formatTime(slot.start_time)} –{" "}
                        {formatTime(slot.end_time)}
                      </TableCell>
                      <TableCell>
                        {slot.zoom_link ? (
                          <Badge>موجود</Badge>
                        ) : (
                          <Badge variant="outline">لا يوجد</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <form action={deleteSlot}>
                          <input type="hidden" name="slot_id" value={slot.id} />
                          <input type="hidden" name="class_id" value={id} />
                          <Button variant="destructive" size="xs" type="submit">
                            حذف
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">إضافة حصة جديدة</CardTitle>
        </CardHeader>
        <CardContent>
          <AddSlotForm
            classId={id}
            subjects={(subjects ?? []).map((s) => ({
              id: s.subject_id,
              label:
                subjectNameById.get(s.subject_id) ?? s.subject_id,
            }))}
            teachers={teacherOptions}
            action={createSlot}
          />
        </CardContent>
      </Card>
    </div>
  );
}
