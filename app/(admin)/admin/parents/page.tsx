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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">إدارة أولياء الأمور</h1>

      <CreateParentForm />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">الاسم</TableHead>
            <TableHead className="text-right">الهاتف</TableHead>
            <TableHead className="text-right">عدد الأبناء المربوطين</TableHead>
            <TableHead className="text-right">الحالة</TableHead>
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
                <TableCell>{profile?.full_name}</TableCell>
                <TableCell dir="ltr" className="text-right">
                  {profile?.phone ?? "—"}
                </TableCell>
                <TableCell>{childCount.get(p.user_id) ?? 0}</TableCell>
                <TableCell>
                  {p.is_active ? (
                    <Badge>نشط</Badge>
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
                      <Button variant="outline" size="xs" type="submit">
                        {p.is_active ? "إيقاف" : "تفعيل"}
                      </Button>
                    </form>
                    <ConfirmDeleteButton
                      action={deleteParent}
                      hiddenFields={{ parent_id: p.user_id }}
                      confirmMessage={`متأكد إنك عايز تحذف ولي الأمر "${profile?.full_name}"؟ الإجراء ده نهائي ومش هيتراجع.`}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {(parents ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                مفيش أولياء أمور لسه
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
