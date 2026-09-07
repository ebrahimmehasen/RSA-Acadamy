import type { NavItem } from "@/components/shared/RoleShell";

export type AppRole = "admin" | "teacher" | "student" | "parent";

/**
 * Single source of truth for each role's sidebar and title, shared by
 * that role's own layout AND by app/settings/layout.tsx — so the
 * profile/notifications/security pages render inside the same shell
 * (same sidebar, same "back" navigation) no matter which role opened
 * them, instead of as bare, disconnected pages.
 */
export const ROLE_NAV: Record<AppRole, { title: string; nav: NavItem[] }> = {
  admin: {
    title: "لوحة الإدارة",
    nav: [
      { href: "/admin/dashboard", label: "الرئيسية" },
      { href: "/admin/students", label: "الطلاب" },
      { href: "/admin/teachers", label: "المدرسون" },
      { href: "/admin/parents", label: "أولياء الأمور" },
      { href: "/admin/classes", label: "الفصول والجدول" },
      { href: "/admin/subjects", label: "المواد" },
      { href: "/admin/announcements", label: "الإعلانات" },
      { href: "/admin/zoom-accounts", label: "حسابات زووم" },
      { href: "/admin/sessions", label: "الحصص المسجلة" },
      { href: "/admin/reports", label: "التقارير" },
      { href: "/admin/security-logs", label: "سجل الأمان" },
      { href: "/admin/admins", label: "فريق الإدارة" },
      { href: "/admin/platform", label: "إعدادات المنصة" },
      { href: "/settings/profile", label: "الملف الشخصي" },
      { href: "/settings/notifications", label: "الإشعارات" },
      { href: "/settings/security", label: "الأمان" },
    ],
  },
  teacher: {
    title: "بوابة المدرس",
    nav: [
      { href: "/teacher/dashboard", label: "الرئيسية" },
      { href: "/teacher/classes", label: "الفصول" },
      { href: "/teacher/gradebook", label: "كشف الدرجات" },
      { href: "/teacher/assignments", label: "الواجبات" },
      { href: "/teacher/quizzes", label: "الاختبارات" },
      { href: "/teacher/sessions", label: "الحصص المسجلة" },
      { href: "/teacher/preferences", label: "التفضيلات" },
      { href: "/announcements", label: "الإعلانات" },
      { href: "/settings/profile", label: "الملف الشخصي" },
      { href: "/settings/notifications", label: "الإشعارات" },
      { href: "/settings/security", label: "الأمان" },
    ],
  },
  student: {
    title: "بوابة الطالب",
    nav: [
      { href: "/student/dashboard", label: "الرئيسية" },
      { href: "/student/schedule", label: "الجدول" },
      { href: "/student/homework", label: "الواجبات" },
      { href: "/student/grades", label: "الدرجات" },
      { href: "/student/sessions", label: "الحصص المسجلة" },
      { href: "/student/quizzes", label: "الاختبارات" },
      { href: "/student/profile", label: "الملف الشخصي" },
      { href: "/announcements", label: "الإعلانات" },
      { href: "/settings/notifications", label: "الإشعارات" },
      { href: "/settings/security", label: "الأمان" },
    ],
  },
  parent: {
    title: "بوابة ولي الأمر",
    nav: [
      { href: "/parent/dashboard", label: "الرئيسية" },
      { href: "/parent/children", label: "الأبناء" },
      { href: "/parent/reports", label: "التقارير" },
      { href: "/announcements", label: "الإعلانات" },
      { href: "/settings/profile", label: "الملف الشخصي" },
      { href: "/settings/notifications", label: "الإشعارات" },
      { href: "/settings/security", label: "الأمان" },
    ],
  },
};
