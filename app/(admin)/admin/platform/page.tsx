import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlatformSettings } from "@/lib/settings";
import { toggleAuthEnabled } from "./actions";
import { ToggleAuthButton } from "./ToggleAuthButton";

export default async function AdminPlatformSettingsPage() {
  const { authEnabled } = await getPlatformSettings();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">إعدادات المنصة</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">تسجيل الدخول وإنشاء الحساب</CardTitle>
          <CardDescription>
            عندما تكون معطَّلة، يظهر زرّا &quot;تسجيل الدخول&quot; و&quot;إنشاء حساب
            جديد&quot; في الصفحة الرئيسية بشارة &quot;SOON&quot;
            ولا يعملان، في حين تبقى الصفحتان نفساهما (/login و/signup)
            تعملان بشكل طبيعي؛ فهذا الإعداد يتحكم فقط في الروابط الظاهرة للزوار الجدد.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            الحالة الحالية:{" "}
            <span
              className={
                authEnabled
                  ? "font-semibold text-green-600"
                  : "font-semibold text-muted-foreground"
              }
            >
              {authEnabled ? "مفعَّلة" : "معطَّلة (SOON)"}
            </span>
          </p>
          <form action={toggleAuthEnabled}>
            <input type="hidden" name="enabled" value={String(authEnabled)} />
            <ToggleAuthButton enabled={authEnabled} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
