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
import { CreateTeacherForm } from "./CreateTeacherForm";
import { deleteTeacher, toggleTeacherActive } from "./actions";

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
            <TableHead />
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
                <TableCell>
                  <Link
                    href={`/admin/teachers/${t.user_id}`}
                    className="hover:underline"
                  >
                    {profile?.full_name}
                  </Link>
                </TableCell>
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
                <TableCell>
                  <div className="flex gap-2">
                    <form action={toggleTeacherActive}>
                      <input type="hidden" name="teacher_id" value={t.user_id} />
                      <input
                        type="hidden"
                        name="is_active"
                        value={String(t.is_active)}
                      />
                      <Button variant="outline" size="xs" type="submit">
                        {t.is_active ? "إيقاف" : "تفعيل"}
                      </Button>
                    </form>
                    <ConfirmDeleteButton
                      action={deleteTeacher}
                      hiddenFields={{ teacher_id: t.user_id }}
                      confirmMessage={`متأكد إنك عايز تحذف المدرس "${profile?.full_name}"؟ الإجراء ده نهائي ومش هيتراجع.`}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {(teachers ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                مفيش مدرسين لسه
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
