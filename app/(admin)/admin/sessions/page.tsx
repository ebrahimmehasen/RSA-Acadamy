import { Video } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { toggleArchived, togglePublished } from "./actions";

export default async function AdminSessionsPage() {
  const supabase = createAdminClient();

  const { data: sessions } = await supabase
    .from("recorded_sessions")
    .select(
      "id, title, view_count, total_rating, rating_count, is_published, is_archived, is_public, classes(class_name), subjects(subject_name), teachers!recorded_sessions_teacher_id_fkey(profiles!teachers_user_id_fkey(full_name))",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <PageShell>
      <PageHeader
        title="إدارة الحصص المسجلة"
        description={`${(sessions ?? []).length} حصة`}
      />
      <div className="grid gap-[var(--card-gap)]">
        {(sessions ?? []).map((s) => {
          const teacherName = (
            s.teachers as unknown as { profiles: { full_name: string } }
          )?.profiles?.full_name;
          return (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{s.title}</CardTitle>
                  <div className="flex gap-1">
                    {s.is_archived && <Badge variant="destructive">مؤرشفة</Badge>}
                    {s.is_published ? (
                      <Badge variant="success">منشورة</Badge>
                    ) : (
                      <Badge variant="outline">غير منشورة</Badge>
                    )}
                    {!s.is_public && <Badge variant="warning">وصول مقيّد</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {(s.classes as unknown as { class_name: string })?.class_name}
                  {" · "}
                  {(s.subjects as unknown as { subject_name: string })?.subject_name}
                  {" · "}
                  {teacherName}
                  {" · "}
                  {s.view_count} مشاهدة
                  {s.rating_count > 0 && ` · ⭐ ${s.total_rating} (${s.rating_count})`}
                </p>
                <div className="flex gap-2">
                  <form action={togglePublished}>
                    <input type="hidden" name="session_id" value={s.id} />
                    <input
                      type="hidden"
                      name="is_published"
                      value={String(s.is_published)}
                    />
                    <Button variant="outline" size="sm" type="submit">
                      {s.is_published ? "إلغاء النشر" : "نشر"}
                    </Button>
                  </form>
                  <form action={toggleArchived}>
                    <input type="hidden" name="session_id" value={s.id} />
                    <input
                      type="hidden"
                      name="is_archived"
                      value={String(s.is_archived)}
                    />
                    <Button variant="outline" size="sm" type="submit">
                      {s.is_archived ? "استرجاع من الأرشيف" : "أرشفة"}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(sessions ?? []).length === 0 && (
          <EmptyState icon={Video} title="لا توجد حصص مرفوعة بعد" />
        )}
      </div>
    </PageShell>
  );
}
