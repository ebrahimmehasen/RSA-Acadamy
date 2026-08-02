import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminDashboard() {
  const session = await getSession();
  const supabase = createAdminClient();

  const [students, teachers, parents] = await Promise.all([
    supabase.from("students").select("user_id", { count: "exact", head: true }),
    supabase.from("teachers").select("user_id", { count: "exact", head: true }),
    supabase.from("parents").select("user_id", { count: "exact", head: true }),
  ]);

  const stats = [
    { title: "الطلاب", count: students.count ?? 0 },
    { title: "المدرسون", count: teachers.count ?? 0 },
    { title: "أولياء الأمور", count: parents.count ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        أهلاً {session?.profile.full_name} 👋
      </h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader>
              <CardDescription>{stat.title}</CardDescription>
              <CardTitle className="text-3xl">{stat.count}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
