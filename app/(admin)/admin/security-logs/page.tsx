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
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataCard } from "@/components/shared/DataCard";

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
    <PageShell>
      <PageHeader
        title="سجل الأمان"
        description="آخر 200 حدث أمني (تفعيل/إلغاء 2FA، محاولات فاشلة، إلخ)"
      />
      <DataCard title="الأحداث" count={(logs ?? []).length}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المستخدم</TableHead>
            <TableHead>الحدث</TableHead>
            <TableHead>الوقت</TableHead>
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
              <TableCell dir="ltr" className="text-start">
                {new Date(log.created_at).toLocaleString("ar-EG")}
              </TableCell>
            </TableRow>
          ))}
          {(logs ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                لا توجد أحداث مسجلة بعد
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </DataCard>
    </PageShell>
  );
}
