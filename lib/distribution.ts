import { createAdminClient } from "@/lib/supabase/admin";
import { DAYS, type DayOfWeek } from "@/lib/schedule";

export interface DistributionSuggestion {
  subjectId: string;
  subjectName: string;
  teacherId: number | null;
  teacherName: string | null;
  dayOfWeek: DayOfWeek | null;
  startTime: string | null;
  endTime: string | null;
  note: string;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Suggests a teacher + weekly slot for every subject of a class that
 * doesn't have an active class_assignments row yet, using
 * teacher_preferences (subject match) + teacher_availability (free
 * slot) + current load (fewest active slots first, for balance).
 * Read-only — admin reviews and accepts each row individually via the
 * existing createSlot action, nothing is written here.
 */
export async function suggestDistribution(
  classId: number,
): Promise<DistributionSuggestion[]> {
  const supabase = createAdminClient();

  const [
    { data: classRow },
    { data: subjects },
    { data: existingSlots },
    { data: preferences },
    { data: availabilities },
    { data: teachers },
  ] = await Promise.all([
    supabase.from("classes").select("id, class_name").eq("id", classId).single(),
    supabase
      .from("subjects")
      .select("subject_id, subject_name, subject_code")
      .eq("class_id", classId)
      .eq("is_active", true),
    supabase
      .from("class_assignments")
      .select("subject_id, teacher_id, day_of_week, start_time, end_time")
      .eq("is_active", true),
    supabase.from("teacher_preferences").select("teacher_id, subjects"),
    supabase.from("teacher_availability").select("*").eq("is_available", true),
    supabase
      .from("teachers")
      .select("user_id, profiles!teachers_user_id_fkey(full_name)")
      .eq("is_active", true),
  ]);

  if (!classRow) return [];

  const teacherNameById = new Map(
    (teachers ?? []).map((t) => [
      t.user_id,
      (t.profiles as unknown as { full_name: string })?.full_name ?? "مدرس",
    ]),
  );

  const coveredSubjectIds = new Set(
    (existingSlots ?? [])
      .filter((s) =>
        (subjects ?? []).some((sub) => sub.subject_id === s.subject_id),
      )
      .map((s) => s.subject_id),
  );

  const missingSubjects = (subjects ?? []).filter(
    (s) => !coveredSubjectIds.has(s.subject_id),
  );

  // current load per teacher (across ALL classes) for balance
  const loadByTeacher = new Map<number, number>();
  for (const slot of existingSlots ?? []) {
    if (slot.teacher_id) {
      loadByTeacher.set(slot.teacher_id, (loadByTeacher.get(slot.teacher_id) ?? 0) + 1);
    }
  }

  // occupied (teacher_id, day) -> list of [start,end] minute ranges
  const busyByTeacherDay = new Map<string, [number, number][]>();
  for (const slot of existingSlots ?? []) {
    if (!slot.teacher_id) continue;
    const key = `${slot.teacher_id}|${slot.day_of_week}`;
    const ranges = busyByTeacherDay.get(key) ?? [];
    ranges.push([toMinutes(slot.start_time), toMinutes(slot.end_time)]);
    busyByTeacherDay.set(key, ranges);
  }

  const suggestions: DistributionSuggestion[] = [];

  for (const subject of missingSubjects) {
    const candidateTeacherIds = (preferences ?? [])
      .filter((p) =>
        ((p.subjects as string[]) ?? []).includes(subject.subject_code),
      )
      .map((p) => p.teacher_id)
      .sort(
        (a, b) => (loadByTeacher.get(a) ?? 0) - (loadByTeacher.get(b) ?? 0),
      );

    let picked: DistributionSuggestion | null = null;

    for (const teacherId of candidateTeacherIds) {
      const teacherSlots = (availabilities ?? []).filter(
        (a) => a.teacher_id === teacherId,
      );
      for (const day of DAYS) {
        const daySlots = teacherSlots.filter((a) => a.day_of_week === day);
        for (const avail of daySlots) {
          const availStart = toMinutes(avail.start_time);
          const availEnd = Math.min(availStart + 60, toMinutes(avail.end_time));
          if (availEnd - availStart < 30) continue;

          const busy = busyByTeacherDay.get(`${teacherId}|${day}`) ?? [];
          const conflict = busy.some(([s, e]) =>
            overlaps(availStart, availEnd, s, e),
          );
          if (conflict) continue;

          picked = {
            subjectId: subject.subject_id,
            subjectName: subject.subject_name,
            teacherId,
            teacherName: teacherNameById.get(teacherId) ?? null,
            dayOfWeek: day,
            startTime: avail.start_time.slice(0, 5),
            endTime: `${String(Math.floor(availEnd / 60)).padStart(2, "0")}:${String(availEnd % 60).padStart(2, "0")}`,
            note: "مقترح بناءً على التفضيلات والتوافر",
          };
          break;
        }
        if (picked) break;
      }
      if (picked) break;
    }

    if (!picked) {
      suggestions.push({
        subjectId: subject.subject_id,
        subjectName: subject.subject_name,
        teacherId: null,
        teacherName: null,
        dayOfWeek: null,
        startTime: null,
        endTime: null,
        note:
          candidateTeacherIds.length === 0
            ? "مفيش مدرس مسجل المادة دي في تفضيلاته"
            : "مفيش وقت متاح بدون تعارض لأي مدرس مرشح",
      });
    } else {
      suggestions.push(picked);
    }
  }

  return suggestions;
}
