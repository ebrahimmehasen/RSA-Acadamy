import { createAdminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminLogTargetType } from "@/lib/adminLog";

export async function AdminEditLogCard({
  targetType,
  targetId,
}: {
  targetType: AdminLogTargetType;
  targetId: number;
}) {
  const supabase = createAdminClient();
  const { data: logs } = await supabase
    .from("admin_edit_log")
    .select("admin_name, description, created_at")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">سجل التعديلات</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {(logs ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">مفيش تعديلات مسجلة لسه</p>
        )}
        {(logs ?? []).map((l, i) => (
          <div key={i} className="rounded-lg border p-2 text-sm">
            <p>{l.description}</p>
            <p className="text-xs text-muted-foreground">
              {l.admin_name} ·{" "}
              {new Date(l.created_at).toLocaleString("ar-EG")}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
