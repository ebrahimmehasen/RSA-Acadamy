import { getSession } from "@/lib/auth/session";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function StudentDashboard() {
  const session = await getSession();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        أهلاً {session?.profile.full_name} 👋
      </h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>حصص اليوم</CardTitle>
            <CardDescription>هتظهر هنا لما يتضاف الجدول</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>واجبات مطلوبة</CardTitle>
            <CardDescription>هتظهر هنا لما تتضاف الواجبات</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>آخر الدرجات</CardTitle>
            <CardDescription>هتظهر هنا بعد التصحيح</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
