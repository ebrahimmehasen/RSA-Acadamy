"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  saveNotificationSettings,
  type SaveNotificationSettingsResult,
} from "./actions";

export function NotificationSettingsForm({
  isParent,
  settings,
}: {
  isParent: boolean;
  settings: {
    class_reminder_enabled: boolean;
    class_reminder_minutes: number;
    assignment_notification: boolean;
    parent_secondary_notifications: boolean;
    email_notifications: boolean;
  };
}) {
  const [result, formAction, isPending] = useActionState<
    SaveNotificationSettingsResult | null,
    FormData
  >(saveNotificationSettings, null);

  return (
    <form action={formAction} className="space-y-4">
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
      {result && (
        <p
          className={`text-sm ${result.ok ? "text-green-600" : "text-destructive"}`}
          aria-live="polite"
        >
          {result.message}
        </p>
      )}
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "جاري الحفظ…" : "حفظ"}
      </Button>
    </form>
  );
}
