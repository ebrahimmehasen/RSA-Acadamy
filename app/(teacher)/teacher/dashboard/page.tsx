import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function TeacherDashboard() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createAdminClient();
  const teacherId = session.profile.id;

  const todayCairo = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    weekday: "long",
  })
    .format(new Date())
    .toLowerCase();

  const [{ count: todayClassesCount }, { data: assignments }, { data: quizzes }] =
    await Promise.all([
      supabase
        .from("class_assignments")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", teacherId)
        .eq("day_of_week", todayCairo)
        .eq("is_active", true),
      supabase.from("assignments").select("id").eq("teacher_id", teacherId),
      supabase.from("quizzes").select("id").eq("teacher_id", teacherId),
    ]);

  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const quizIds = (quizzes ?? []).map((q) => q.id);

  const [{ count: pendingGradingCount }, { count: pendingQuizGradingCount }] =
    await Promise.all([
      assignmentIds.length
        ? supabase
            .from("assignment_submissions")
            .select("id", { count: "exact", head: true })
            .in("assignment_id", assignmentIds)
            .eq("status", "submitted")
        : Promise.resolve({ count: 0 }),
      quizIds.length
        ? supabase
            .from("quiz_submissions")
            .select("id", { count: "exact", head: true })
            .in("quiz_id", quizIds)
            .eq("status", "submitted")
        : Promise.resolve({ count: 0 }),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        أهلاً أ/ {session.profile.full_name} 👋
      </h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>حصص اليوم</CardTitle>
            <CardDescription>
              {todayClassesCount ?? 0} حصة مجدولة اليوم
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>واجبات بانتظار التصحيح</CardTitle>
            <CardDescription>
              {pendingGradingCount ?? 0} تسليم لسه محتاج تصحيح
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>كويزات بانتظار تصحيح يدوي</CardTitle>
            <CardDescription>
              {pendingQuizGradingCount ?? 0} تسليم كويز محتاج مراجعة
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
