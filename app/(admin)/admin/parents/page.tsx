import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/shared/ConfirmDeleteButton";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataCard } from "@/components/shared/DataCard";
import { CreateParentForm } from "./CreateParentForm";
import { deleteParent, toggleParentActive } from "./actions";

export default async function AdminParentsPage() {
  const supabase = createAdminClient();

  const [{ data: parents }, { data: children }] = await Promise.all([
    supabase
      .from("parents")
      .select("user_id, is_active, profiles!parents_user_id_fkey(full_name, phone)")
      .order("user_id", { ascending: false }),
    supabase.from("students").select("parent_id"),
  ]);

  const childCount = new Map<number, number>();
  for (const child of children ?? []) {
    if (child.parent_id) {
      childCount.set(child.parent_id, (childCount.get(child.parent_id) ?? 0) + 1);
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="إدارة أولياء الأمور"
        description={`${(parents ?? []).length} ولي أمر`}
      />

      <CreateParentForm />

      <DataCard title="أولياء الأمور" count={(parents ?? []).length}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الاسم</TableHead>
            <TableHead>الهاتف</TableHead>
            <TableHead>عدد الأبناء المربوطين</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(parents ?? []).map((p) => {
            const profile = p.profiles as unknown as {
              full_name: string;
              phone: string | null;
            };
            return (
              <TableRow key={p.user_id}>
                <TableCell>
                  <Link
                    href={`/admin/parents/${p.user_id}`}
                    className="hover:underline"
                  >
                    {profile?.full_name}
                  </Link>
                </TableCell>
                <TableCell dir="ltr" className="text-start">
                  {profile?.phone ?? "—"}
                </TableCell>
                <TableCell>{childCount.get(p.user_id) ?? 0}</TableCell>
                <TableCell>
                  {p.is_active ? (
                    <Badge variant="success">نشط</Badge>
                  ) : (
                    <Badge variant="destructive">موقوف</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <form action={toggleParentActive}>
                      <input type="hidden" name="parent_id" value={p.user_id} />
                      <input
                        type="hidden"
                        name="is_active"
                        value={String(p.is_active)}
                      />
                      <Button variant="outline" size="sm" type="submit">
                        {p.is_active ? "إيقاف" : "تفعيل"}
                      </Button>
                    </form>
                    <ConfirmDeleteButton
                      action={deleteParent}
                      hiddenFields={{ parent_id: p.user_id }}
                      confirmMessage={`هل أنت متأكد من رغبتك في حذف ولي الأمر "${profile?.full_name}"؟ هذا الإجراء نهائي ولا يمكن التراجع عنه.`}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {(parents ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                لا يوجد أولياء أمور بعد
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </DataCard>
    </PageShell>
  );
}
