import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { DAYS, DAY_LABELS, formatTime } from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { addAvailability, removeAvailability, savePreferences } from "./actions";

export default async function TeacherPreferencesPage() {
  const session = await getSession();
  const supabase = await createClient();

  const [{ data: classes }, { data: prefs }, { data: availability }] =
    await Promise.all([
      supabase.from("classes").select("id, class_name").order("id"),
      supabase
        .from("teacher_preferences")
        .select("subjects, classes")
        .eq("teacher_id", session!.profile.id)
        .maybeSingle(),
      supabase
        .from("teacher_availability")
        .select("*")
        .eq("teacher_id", session!.profile.id)
        .order("day_of_week")
        .order("start_time"),
    ]);

  const preferredClasses = new Set<number>((prefs?.classes as number[]) ?? []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">التفضيلات</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الفصول المفضّلة</CardTitle>
          <CardDescription>
            بتساعد الإدارة توزّع الجدول بشكل أفضل — مش إلزامية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={savePreferences} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(classes ?? []).map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    name="classes"
                    value={c.id}
                    defaultChecked={preferredClasses.has(c.id)}
                  />
                  {c.class_name}
                </label>
              ))}
            </div>
            <Button type="submit" size="sm">
              حفظ الفصول المفضّلة
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">أوقات التواجد</CardTitle>
          <CardDescription>الأوقات اللي تقدر تدرّس فيها أسبوعيًا</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS.map((day) => {
            const daySlots = (availability ?? []).filter(
              (a) => a.day_of_week === day,
            );
            if (daySlots.length === 0) return null;
            return (
              <div key={day} className="flex flex-wrap items-center gap-2">
                <span className="w-20 font-medium">{DAY_LABELS[day]}</span>
                {daySlots.map((slot) => (
                  <form key={slot.id} action={removeAvailability}>
                    <input type="hidden" name="slot_id" value={slot.id} />
                    <button
                      type="submit"
                      className="rounded-full border px-3 py-1 text-xs hover:bg-destructive/10"
                      dir="ltr"
                    >
                      {formatTime(slot.start_time)}–{formatTime(slot.end_time)} ✕
                    </button>
                  </form>
                ))}
              </div>
            );
          })}

          <form
            action={addAvailability}
            className="flex flex-wrap items-end gap-3 border-t pt-4"
          >
            <div className="space-y-1">
              <label className="text-sm" htmlFor="day_of_week">
                اليوم
              </label>
              <select
                id="day_of_week"
                name="day_of_week"
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {DAY_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="start_time">
                من
              </label>
              <Input id="start_time" name="start_time" type="time" dir="ltr" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="end_time">
                إلى
              </label>
              <Input id="end_time" name="end_time" type="time" dir="ltr" required />
            </div>
            <Button type="submit" size="sm">
              إضافة
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
