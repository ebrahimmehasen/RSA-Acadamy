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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">فريق الإدارة</h1>

      <CreateAdminForm />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">الاسم</TableHead>
            <TableHead className="text-right">البريد الإلكتروني</TableHead>
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
                  <Badge className="mr-2">المسؤول الرئيسي</Badge>
                )}
              </TableCell>
              <TableCell dir="ltr" className="text-right">
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
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                لا يوجد مسؤولون بعد
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
