import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function StudentSessionsPage() {
  const session = await getSession();
  const supabase = await createClient();

  const [{ data: sessions }, { data: views }] = await Promise.all([
    supabase
      .from("recorded_sessions")
      .select("id, title, session_date, view_count, total_rating, rating_count, subjects(subject_name)")
      .eq("is_published", true)
      .order("session_date", { ascending: false }),
    supabase
      .from("session_views")
      .select("session_id, watch_percentage")
      .eq("student_id", session!.profile.id),
  ]);

  const watchByeSession = new Map((views ?? []).map((v) => [v.session_id, v.watch_percentage]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الحصص المسجلة</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {(sessions ?? []).map((s) => {
          const watched = watchByeSession.get(s.id);
          return (
            <Link key={s.id} href={`/student/sessions/${s.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader>
                  <CardTitle className="text-base">{s.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {(s.subjects as unknown as { subject_name: string })?.subject_name}
                  </span>
                  {s.rating_count > 0 && (
                    <Badge variant="outline">⭐ {s.total_rating}</Badge>
                  )}
                  {watched !== undefined && (
                    <Badge variant={watched >= 90 ? "default" : "secondary"}>
                      {watched >= 90 ? "شاهدتها" : `${Math.round(watched)}%`}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {(sessions ?? []).length === 0 && (
          <p className="text-muted-foreground">مفيش حصص متاحة لسه</p>
        )}
      </div>
    </div>
  );
}
