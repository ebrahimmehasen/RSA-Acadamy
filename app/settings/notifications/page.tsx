import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getNotificationSettings } from "@/lib/notifications/create";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { NotificationSettingsForm } from "./NotificationSettingsForm";

export default async function NotificationSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const settings = await getNotificationSettings(session.profile.id);
  const isParent = session.profile.role === "parent";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-[var(--section-gap)]">
      <PageHeader title="إعدادات الإشعارات" />
      <SectionCard
        title="أنواع الإشعارات"
        description="تحكّم في الإشعارات التي ترغب في استقبالها"
      >
        <NotificationSettingsForm isParent={isParent} settings={settings} />
      </SectionCard>
    </div>
  );
}
