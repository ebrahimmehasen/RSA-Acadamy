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
        أهلاً بك يا {session?.profile.full_name}! يوم دراسي موفّق 👋
      </h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>حصص اليوم</CardTitle>
            <CardDescription>ستظهر هنا بعد إضافة الجدول</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>واجبات مطلوبة</CardTitle>
            <CardDescription>ستظهر هنا بعد إضافة الواجبات</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>آخر الدرجات</CardTitle>
            <CardDescription>ستظهر هنا بعد التصحيح</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
