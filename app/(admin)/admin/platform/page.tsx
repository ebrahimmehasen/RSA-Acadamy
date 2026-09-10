import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { getPlatformSettings } from "@/lib/settings";
import { toggleAuthEnabled } from "./actions";
import { ToggleAuthButton } from "./ToggleAuthButton";

export default async function AdminPlatformSettingsPage() {
  const { authEnabled } = await getPlatformSettings();

  return (
    <PageShell>
      <PageHeader title="إعدادات المنصة" />

      <SectionCard
        title="تسجيل الدخول وإنشاء الحساب"
        description={
          <>
            عندما تكون معطَّلة، يظهر زرّا &quot;تسجيل الدخول&quot; و&quot;إنشاء حساب
            جديد&quot; في الصفحة الرئيسية بشارة &quot;SOON&quot; ولا يعملان، في حين
            تبقى الصفحتان نفساهما (/login و/signup) تعملان بشكل طبيعي؛ فهذا الإعداد
            يتحكم فقط في الروابط الظاهرة للزوار الجدد.
          </>
        }
        contentClassName="space-y-3"
      >
        <p className="flex items-center gap-2 text-sm">
          الحالة الحالية:{" "}
          {authEnabled ? (
            <Badge variant="success">مفعَّلة</Badge>
          ) : (
            <Badge variant="outline">معطَّلة (SOON)</Badge>
          )}
        </p>
        <form action={toggleAuthEnabled}>
          <input type="hidden" name="enabled" value={String(authEnabled)} />
          <ToggleAuthButton enabled={authEnabled} />
        </form>
      </SectionCard>
    </PageShell>
  );
}
