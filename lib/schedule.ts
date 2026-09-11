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
  /** set = a private lesson for exactly this one student, not the whole class */
  student_id: number | null;
}

/**
 * A class can hold both branches (Arabic + Languages), so a student's
 * schedule must only show slots for subjects in their own branch —
 * never the whole class's. `students.branch` is the normal source of
 * truth; a hand-created account that skipped it falls back to the
 * subjects the student is actually enrolled in (`student_subjects`),
 * and only shows everything as a last resort when neither is known
 * (better than an empty schedule).
 *
 * A 'Private' student has no branch-wide subjects at all — RLS itself
 * already scopes what comes back to just their own private slots
 * (class_assignments.student_id), so no further filtering applies.
 */
export function filterSlotsForStudentBranch<
  T extends { subject_id: string; subjects?: { branch: string } | null },
>(
  slots: T[],
  branch: string | null,
  enrolledSubjectIds?: Set<string> | null,
): T[] {
  if (branch === "Private") return slots;
  if (branch) return slots.filter((s) => s.subjects?.branch === branch);
  if (enrolledSubjectIds && enrolledSubjectIds.size > 0) {
    return slots.filter((s) => enrolledSubjectIds.has(s.subject_id));
  }
  return slots;
}

/** 14, 30 → "2:30 م" */
export function formatHourMinute(h: number, m: number): string {
  const period = h >= 12 ? "م" : "ص";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/** "14:30:00" → "2:30 م" */
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return formatHourMinute(h, m);
}

/**
 * Fixed periods for the whole platform (matches the school's real
 * timetable). Start/end times are chosen from this list rather than
 * typed freely, so every class/teacher slot lines up on the same grid.
 */
export const PERIODS = [
  { label: "الحصة الأولى", start: "09:15", end: "10:00" },
  { label: "الحصة الثانية", start: "10:00", end: "10:45" },
  { label: "الحصة الثالثة", start: "10:45", end: "11:30" },
  { label: "الحصة الرابعة", start: "11:30", end: "12:15" },
  { label: "الحصة الخامسة", start: "12:30", end: "13:15" },
  { label: "الحصة السادسة", start: "13:15", end: "14:00" },
] as const;

export function periodValue(p: (typeof PERIODS)[number]): string {
  return `${p.start}-${p.end}`;
}

export function parsePeriod(
  value: string,
): { start: string; end: string } | null {
  const match = PERIODS.find((p) => periodValue(p) === value);
  return match ? { start: match.start, end: match.end } : null;
}
