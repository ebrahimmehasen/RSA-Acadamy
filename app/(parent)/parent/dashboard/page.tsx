import { getSession } from "@/lib/auth/session";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ParentDashboard() {
  const session = await getSession();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        أهلاً {session?.profile.full_name} 👋
      </h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>الأبناء</CardTitle>
            <CardDescription>اربط أبناءك بكود الطالب من صفحة الأبناء</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>الرسوم المستحقة</CardTitle>
            <CardDescription>هتظهر هنا لما الإدارة تحدد الرسوم</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
