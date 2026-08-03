import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnnouncementForm } from "./AnnouncementForm";

const TARGET_LABEL: Record<string, string> = {
  all: "الجميع",
  role: "دور محدد",
  class: "فصل محدد",
  branch: "شعبة محددة",
  student: "طالب محدد",
};

export default async function AdminAnnouncementsPage() {
  const supabase = createAdminClient();

  const [{ data: classes }, { data: announcements }] = await Promise.all([
    supabase.from("classes").select("id, class_name").order("id"),
    supabase
      .from("announcements")
      .select("*, classes(class_name)")
      .order("published_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الإعلانات</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">إعلان جديد</CardTitle>
        </CardHeader>
        <CardContent>
          <AnnouncementForm classes={classes ?? []} />
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {(announcements ?? []).map((a) => (
          <Card key={a.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{a.title_ar}</CardTitle>
                <Badge variant="outline">
                  {TARGET_LABEL[a.target_type]}
                  {a.target_type === "class" &&
                    ` — ${(a.classes as unknown as { class_name: string })?.class_name}`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="whitespace-pre-wrap">{a.content_ar}</p>
              {(a.attachment_drive_ids as string[])?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(a.attachment_drive_ids as string[]).map((id, i) => (
                    <a
                      key={id}
                      href={`/api/files/${id}`}
                      target="_blank"
                      className="text-primary underline underline-offset-4"
                    >
                      مرفق {i + 1} 📎
                    </a>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                <span dir="ltr">{new Date(a.published_at).toLocaleString("ar-EG")}</span>
                {" · "}👁️ اتقرا من {(a.read_by as number[])?.length ?? 0} شخص
              </p>
            </CardContent>
          </Card>
        ))}
        {(announcements ?? []).length === 0 && (
          <p className="text-muted-foreground">مفيش إعلانات لسه</p>
        )}
      </div>
    </div>
  );
}
