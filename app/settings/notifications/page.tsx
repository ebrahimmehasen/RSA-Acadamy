import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getNotificationSettings } from "@/lib/notifications/create";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { saveNotificationSettings } from "./actions";

export default async function NotificationSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const settings = await getNotificationSettings(session.profile.id);
  const isParent = session.profile.role === "parent";

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4 md:p-6" dir="rtl">
      <h1 className="text-2xl font-bold">إعدادات الإشعارات</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">أنواع الإشعارات</CardTitle>
          <CardDescription>تحكّم في الإشعارات اللي تحب تستقبلها</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveNotificationSettings} className="space-y-4">
            <label className="flex items-center justify-between gap-4 text-sm">
              <span>تذكير قبل بداية الحصة</span>
              <Checkbox
                name="class_reminder_enabled"
                defaultChecked={settings.class_reminder_enabled}
              />
            </label>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="class_reminder_minutes">
                كام دقيقة قبل الحصة؟
              </label>
              <select
                id="class_reminder_minutes"
                name="class_reminder_minutes"
                defaultValue={settings.class_reminder_minutes}
                className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
              >
                <option value={5}>5 دقايق</option>
                <option value={10}>10 دقايق</option>
                <option value={15}>15 دقيقة</option>
                <option value={30}>30 دقيقة</option>
              </select>
            </div>
            <label className="flex items-center justify-between gap-4 text-sm">
              <span>إشعارات الواجبات</span>
              <Checkbox
                name="assignment_notification"
                defaultChecked={settings.assignment_notification}
              />
            </label>
            <label className="flex items-center justify-between gap-4 text-sm">
              <span>إشعارات المدفوعات</span>
              <Checkbox
                name="payment_notification"
                defaultChecked={settings.payment_notification}
              />
            </label>
            {isParent && (
              <label className="flex items-center justify-between gap-4 text-sm">
                <span>إشعارات ثانوية (إعلانات عامة، حصص مسجلة، اختبارات)</span>
                <Checkbox
                  name="parent_secondary_notifications"
                  defaultChecked={settings.parent_secondary_notifications}
                />
              </label>
            )}
            <label className="flex items-center justify-between gap-4 text-sm">
              <span>إشعارات عبر البريد الإلكتروني</span>
              <Checkbox
                name="email_notifications"
                defaultChecked={settings.email_notifications}
              />
            </label>
            <Button type="submit" size="sm">
              حفظ
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
