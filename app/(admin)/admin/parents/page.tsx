import { createAdminClient } from "@/lib/supabase/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateParentForm } from "./CreateParentForm";

export default async function AdminParentsPage() {
  const supabase = createAdminClient();

  const [{ data: parents }, { data: children }] = await Promise.all([
    supabase
      .from("parents")
      .select("user_id, profiles!parents_user_id_fkey(full_name, phone)")
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
              </TableRow>
            );
          })}
          {(parents ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                مفيش أولياء أمور لسه
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
