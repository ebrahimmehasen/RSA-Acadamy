import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const EVENT_LABEL: Record<string, string> = {
  "2fa_enabled": "تفعيل 2FA",
  "2fa_disabled": "إلغاء تفعيل 2FA",
  "2fa_verify_failed": "فشل تحقق 2FA",
  backup_code_used: "استخدام كود استرجاع",
};

export default async function AdminSecurityLogsPage() {
  const supabase = createAdminClient();

  const { data: logs } = await supabase
    .from("security_logs")
    .select("id, event_type, created_at, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">سجل الأمان</h1>
        <p className="text-muted-foreground">
          آخر 200 حدث أمني (تفعيل/إلغاء 2FA، محاولات فاشلة، إلخ)
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">المستخدم</TableHead>
            <TableHead className="text-right">الحدث</TableHead>
            <TableHead className="text-right">الوقت</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(logs ?? []).map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                {(log.profiles as unknown as { full_name: string })
                  ?.full_name ?? "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    log.event_type.includes("failed") ? "destructive" : "outline"
                  }
                >
                  {EVENT_LABEL[log.event_type] ?? log.event_type}
                </Badge>
              </TableCell>
              <TableCell dir="ltr" className="text-right">
                {new Date(log.created_at).toLocaleString("ar-EG")}
              </TableCell>
            </TableRow>
          ))}
          {(logs ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                مفيش أحداث مسجلة لسه
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
