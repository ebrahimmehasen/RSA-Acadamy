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
import { CreateTeacherForm } from "./CreateTeacherForm";

export default async function AdminTeachersPage() {
  const supabase = createAdminClient();

  const { data: teachers } = await supabase
    .from("teachers")
    .select(
      "user_id, specialization, is_active, profiles!teachers_user_id_fkey(full_name, phone)",
    )
    .order("user_id", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">إدارة المدرسين</h1>

      <CreateTeacherForm />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">الاسم</TableHead>
            <TableHead className="text-right">التخصص</TableHead>
            <TableHead className="text-right">الهاتف</TableHead>
            <TableHead className="text-right">الحالة</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(teachers ?? []).map((t) => {
            const profile = t.profiles as unknown as {
              full_name: string;
              phone: string | null;
            };
            return (
              <TableRow key={t.user_id}>
                <TableCell>{profile?.full_name}</TableCell>
                <TableCell>{t.specialization ?? "—"}</TableCell>
                <TableCell dir="ltr" className="text-right">
                  {profile?.phone ?? "—"}
                </TableCell>
                <TableCell>
                  {t.is_active ? (
                    <Badge>نشط</Badge>
                  ) : (
                    <Badge variant="destructive">موقوف</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {(teachers ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                مفيش مدرسين لسه
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
