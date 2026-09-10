import { getSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteButton } from "@/components/shared/ConfirmDeleteButton";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataCard } from "@/components/shared/DataCard";
import { CreateAdminForm } from "./CreateAdminForm";
import { deleteAdminAction } from "./actions";

export default async function AdminAdminsPage() {
  const session = await getSession();
  const supabase = createAdminClient();

  const { data: admins } = await supabase
    .from("profiles")
    .select("id, user_id, full_name, is_super_admin, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });

  const canDelete = session?.profile.is_super_admin ?? false;

  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const emailByUserId = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, u.email ?? "—"]),
  );

  return (
    <PageShell>
      <PageHeader
        title="فريق الإدارة"
        description={`${(admins ?? []).length} مسؤول`}
      />

      <CreateAdminForm />

      <DataCard title="المسؤولون" count={(admins ?? []).length}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الاسم</TableHead>
            <TableHead>البريد الإلكتروني</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(admins ?? []).map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                {a.full_name}
                {a.id === session?.profile.id && (
                  <Badge className="mr-2" variant="secondary">
                    أنت
                  </Badge>
                )}
                {a.is_super_admin && (
                  <Badge className="mr-2" variant="info">المسؤول الرئيسي</Badge>
                )}
              </TableCell>
              <TableCell dir="ltr" className="text-start">
                {emailByUserId.get(a.user_id) ?? "—"}
              </TableCell>
              <TableCell>
                {canDelete && a.id !== session?.profile.id && (
                  <ConfirmDeleteButton
                    action={deleteAdminAction}
                    hiddenFields={{ admin_id: a.id }}
                    confirmMessage={`هل أنت متأكد من رغبتك في حذف المسؤول "${a.full_name}"؟ هذا الإجراء نهائي ولا يمكن التراجع عنه.`}
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
          {(admins ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                لا يوجد مسؤولون بعد
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </DataCard>
    </PageShell>
  );
}
