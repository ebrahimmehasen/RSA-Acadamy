import { getSession } from "@/lib/auth/session";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function TeacherDashboard() {
  const session = await getSession();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        أهلاً أ/ {session?.profile.full_name} 👋
      </h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>فصولك</CardTitle>
            <CardDescription>هتظهر هنا لما الإدارة توزع الجدول</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>واجبات بانتظار التصحيح</CardTitle>
            <CardDescription>هتظهر هنا لما الطلاب يسلموا</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
