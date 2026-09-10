import type { DayOfWeek } from "@/lib/schedule";

/**
 * All schedule times in the database (class_assignments, teacher
 * availability, the fixed PERIODS grid) are wall-clock times in the
 * school's own timezone — Cairo, Egypt — regardless of where the
 * viewer actually is (many students/parents/teachers are in Saudi
 * Arabia and elsewhere in the Gulf).
 *
 * Egypt and Saudi Arabia read the same clock time only while Egypt
 * observes daylight saving; Saudi Arabia never does. So a naive
 * "HH:mm" label is only correct for a Gulf viewer part of the year —
 * the moment Egypt's DST ends, every displayed time is off by an
 * hour for them unless it's converted per-viewer. `localHourMinute`
 * below does that conversion correctly for whatever date/DST state is
 * actually in effect, using only the browser's own timezone — no
 * hardcoded offset, no library.
 */
export const SCHOOL_TIMEZONE = "Africa/Cairo";

/** IANA timezone → Arabic country name, for the region our users are in. */
const TZ_COUNTRY: Record<string, string> = {
  "Africa/Cairo": "مصر",
  "Asia/Riyadh": "السعودية",
  "Asia/Dubai": "الإمارات",
  "Asia/Kuwait": "الكويت",
  "Asia/Qatar": "قطر",
  "Asia/Bahrain": "البحرين",
  "Asia/Muscat": "عُمان",
  "Asia/Amman": "الأردن",
  "Asia/Beirut": "لبنان",
  "Asia/Baghdad": "العراق",
  "Asia/Damascus": "سوريا",
  "Asia/Jerusalem": "فلسطين",
  "Asia/Gaza": "فلسطين",
  "Asia/Hebron": "فلسطين",
  "Africa/Khartoum": "السودان",
  "Africa/Tripoli": "ليبيا",
  "Africa/Tunis": "تونس",
  "Africa/Algiers": "الجزائر",
  "Africa/Casablanca": "المغرب",
  "Asia/Aden": "اليمن",
};

/**
 * A human label for the timezone the times on screen are shown in —
 * the viewer's own. A known country name where we have one, otherwise
 * the localized long zone name, else a generic fallback.
 */
export function timezoneLabel(timeZone: string): string {
  if (TZ_COUNTRY[timeZone]) return TZ_COUNTRY[timeZone];
  try {
    const name = new Intl.DateTimeFormat("ar", {
      timeZone,
      timeZoneName: "long",
    })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    if (name) return name;
  } catch {
    // invalid/unknown zone — fall through
  }
  return "توقيتك المحلي";
}

const DAY_INDEX: Record<DayOfWeek, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** The next calendar date (today included) that falls on `dayOfWeek`, as "YYYY-MM-DD" in the viewer's local calendar. */
function nextDateForWeekday(dayOfWeek: DayOfWeek): string {
  const target = DAY_INDEX[dayOfWeek];
  const now = new Date();
  const diff = (target - now.getDay() + 7) % 7;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Resolves a wall-clock "HH:mm" time on a given date, interpreted in
 * `timeZone`, to the actual UTC instant it refers to — correctly
 * accounting for that timezone's DST rules on that specific date.
 */
function zonedWallTimeToInstant(
  dateStr: string,
  timeStr: string,
  timeZone: string,
): Date {
  const asIfUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  const tzString = asIfUtc.toLocaleString("en-US", { timeZone });
  const utcString = asIfUtc.toLocaleString("en-US", { timeZone: "UTC" });
  const offset = new Date(utcString).getTime() - new Date(tzString).getTime();
  return new Date(asIfUtc.getTime() + offset);
}

/**
 * Converts a Cairo-time schedule slot ("HH:mm:ss" or "HH:mm", tied to
 * a weekday) into the hour/minute the viewer's own browser timezone
 * would show for its next occurrence. Must run client-side — the
 * server doesn't know the viewer's timezone or local "today".
 */
export function localHourMinute(
  dayOfWeek: DayOfWeek,
  time: string,
): { hour: number; minute: number } {
  const [h, m] = time.split(":").map(Number);
  const hhmm = `${pad(h)}:${pad(m)}`;
  const dateStr = nextDateForWeekday(dayOfWeek);
  const instant = zonedWallTimeToInstant(dateStr, hhmm, SCHOOL_TIMEZONE);
  return { hour: instant.getHours(), minute: instant.getMinutes() };
}
