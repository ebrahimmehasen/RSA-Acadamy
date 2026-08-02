export const DAYS = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
] as const;

export type DayOfWeek = (typeof DAYS)[number];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  saturday: "السبت",
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
};

export interface ScheduleSlot {
  id: number;
  class_id: number;
  subject_id: string;
  teacher_id: number | null;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  zoom_link: string | null;
  zoom_meeting_id: string | null;
  zoom_passcode: string | null;
  is_active: boolean;
}

/** "14:30:00" → "2:30 م" */
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "م" : "ص";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}
