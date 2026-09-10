import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { DAYS, DAY_LABELS, PERIODS, formatTime, periodValue } from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { SELECT_CLASS } from "@/lib/ui";
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
    <PageShell>
      <PageHeader title="التفضيلات" />

      <SectionCard
        title="الفصول المفضّلة"
        description="تساعد الإدارة على توزيع الجدول بشكل أفضل، وهي غير إلزامية"
      >
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
      </SectionCard>

      <SectionCard
        title="أوقات التواجد"
        description="الأوقات التي تستطيع التدريس فيها أسبوعيًا — كل الحصص بتوقيت القاهرة"
        contentClassName="space-y-4"
      >
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
                className={`${SELECT_CLASS} w-auto`}
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {DAY_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="period">
                الحصة
              </label>
              <select
                id="period"
                name="period"
                required
                className={`${SELECT_CLASS} w-auto`}
              >
                {PERIODS.map((p) => (
                  <option key={periodValue(p)} value={periodValue(p)}>
                    {p.label} ({formatTime(p.start)}–{formatTime(p.end)})
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm">
              إضافة
            </Button>
          </form>
      </SectionCard>
    </PageShell>
  );
}
