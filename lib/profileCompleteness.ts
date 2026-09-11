/**
 * Profile-completeness checks shown as a persistent warning banner
 * across the platform (RoleShell) until fixed. Targets accounts an
 * admin bulk-created (SQL/admin panel) that never went through the
 * self-signup form's required fields.
 */

export interface ProfileWarningItem {
  message: string;
  href: string;
  linkLabel: string;
}

/**
 * A phone number an admin punched in as a placeholder rather than the
 * real one: empty, too short, or every digit the same (e.g. "0000000000").
 */
export function isPhoneMissingOrFake(phone: string | null): boolean {
  if (!phone) return true;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return true;
  if (new Set(digits).size === 1) return true;
  return false;
}

export function getTeacherProfileWarnings(input: {
  phone: string | null;
  pictureDriveId: string | null;
  cvDriveId: string | null;
  subjectsCount: number;
}): ProfileWarningItem[] {
  const items: ProfileWarningItem[] = [];

  if (input.subjectsCount === 0) {
    items.push({
      message: "لم تختر المواد التي يمكنك تدريسها بعد",
      href: "/teacher/preferences",
      linkLabel: "اختر موادك",
    });
  }
  if (!input.cvDriveId) {
    items.push({
      message: "لم ترفع سيرتك الذاتية (CV) بعد",
      href: "/settings/profile",
      linkLabel: "ارفع السيرة الذاتية",
    });
  }
  if (!input.pictureDriveId) {
    items.push({
      message: "لم تضف صورة شخصية بعد",
      href: "/settings/profile",
      linkLabel: "أضف صورة",
    });
  }
  if (isPhoneMissingOrFake(input.phone)) {
    items.push({
      message: "رقم هاتفك غير مكتمل أو غير صحيح",
      href: "/settings/profile",
      linkLabel: "حدّث رقم الهاتف",
    });
  }

  return items;
}

export function getStudentProfileWarnings(input: {
  pictureDriveId: string | null;
}): ProfileWarningItem[] {
  const items: ProfileWarningItem[] = [];

  if (!input.pictureDriveId) {
    items.push({
      message: "لم تضف صورة شخصية بعد",
      href: "/settings/profile",
      linkLabel: "أضف صورة",
    });
  }

  return items;
}
