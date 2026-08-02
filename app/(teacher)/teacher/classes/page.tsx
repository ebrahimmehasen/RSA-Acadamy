import { createClient } from "@/lib/supabase/server";
import {
  DAYS,
  DAY_LABELS,
  formatTime,
  type ScheduleSlot,
} from "@/lib/schedule";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function TeacherClassesPage() {
  const supabase = await createClient();

  // RLS scopes rows to the teacher's own slots
  const { data: slots } = await supabase
    .from("class_assignments")
    .select("*, subjects(subject_name), classes(class_name)")
    .eq("is_active", true)
    .order("start_time");

  const typedSlots = (slots ?? []) as (ScheduleSlot & {
    subjects: { subject_name: string } | null;
    classes: { class_name: string } | null;
  })[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">فصولك وجدولك الأسبوعي</h1>
      {typedSlots.length === 0 && (
        <p className="text-muted-foreground">
          الإدارة لسه موزعتلكش حصص في الجدول.
        </p>
      )}
      {DAYS.map((day) => {
        const daySlots = typedSlots.filter((s) => s.day_of_week === day);
        if (daySlots.length === 0) return null;
        return (
          <Card key={day}>
            <CardHeader>
              <CardTitle className="text-lg">{DAY_LABELS[day]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {daySlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {slot.subjects?.subject_name ?? slot.subject_id}
                      {" — "}
                      <span className="text-muted-foreground">
                        {slot.classes?.class_name}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground" dir="ltr">
                      {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                    </p>
                  </div>
                  {slot.zoom_link && (
                    <Button
                      size="sm"
                      render={
                        <a
                          href={slot.zoom_link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          بدء الحصة 🔗
                        </a>
                      }
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
