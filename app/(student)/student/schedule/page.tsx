import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import {
  DAYS,
  DAY_LABELS,
  type ScheduleSlot,
} from "@/lib/schedule";
import { CalendarX } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScheduleTime } from "@/components/shared/ScheduleTime";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

export default async function StudentSchedulePage() {
  const session = await getSession();
  const supabase = await createClient();

  // RLS scopes rows to the student's own class
  const { data: slots } = await supabase
    .from("class_assignments")
    .select("*, subjects(subject_name)")
    .eq("is_active", true)
    .order("start_time");

  const { data: student } = await supabase
    .from("students")
    .select("class_id, branch")
    .eq("user_id", session!.profile.id)
    .single();

  const typedSlots = (slots ?? []) as (ScheduleSlot & {
    subjects: { subject_name: string } | null;
  })[];

  if (!student?.class_id) {
    return (
      <PageShell>
        <PageHeader title="الجدول الدراسي" />
        <EmptyState
          icon={CalendarX}
          title="لم يتم تسجيلك في أي فصل بعد"
          description="يُرجى التواصل مع الإدارة."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader title="الجدول الدراسي" />
      {typedSlots.length === 0 && (
        <EmptyState icon={CalendarX} title="لا توجد حصص في الجدول حتى الآن." />
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
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <ScheduleTime
                        dayOfWeek={day}
                        startTime={slot.start_time}
                        endTime={slot.end_time}
                      />
                    </p>
                    {slot.zoom_passcode && (
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        Passcode: {slot.zoom_passcode}
                      </p>
                    )}
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
                          دخول الحصة 🔗
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
    </PageShell>
  );
}
