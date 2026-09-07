import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getNotificationSettings } from "@/lib/notifications/create";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NotificationSettingsForm } from "./NotificationSettingsForm";

export default async function NotificationSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const settings = await getNotificationSettings(session.profile.id);
  const isParent = session.profile.role === "parent";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">إعدادات الإشعارات</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">أنواع الإشعارات</CardTitle>
          <CardDescription>تحكّم في الإشعارات التي ترغب في استقبالها</CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationSettingsForm isParent={isParent} settings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
