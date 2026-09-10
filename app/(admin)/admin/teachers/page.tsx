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
    <PageShell>
      <PageHeader
        title="إدارة المدرسين"
        description={`${(teachers ?? []).length} مدرس`}
      />

      <CreateTeacherForm />

      <DataCard title="المدرسون" count={(teachers ?? []).length}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الاسم</TableHead>
            <TableHead>التخصص</TableHead>
            <TableHead>الهاتف</TableHead>
            <TableHead>الحالة</TableHead>
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
                <TableCell dir="ltr" className="text-start">
                  {profile?.phone ?? "—"}
                </TableCell>
                <TableCell>
                  {t.is_active ? (
                    <Badge variant="success">نشط</Badge>
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
                      <Button variant="outline" size="sm" type="submit">
                        {t.is_active ? "إيقاف" : "تفعيل"}
                      </Button>
                    </form>
                    <ConfirmDeleteButton
                      action={deleteTeacher}
                      hiddenFields={{ teacher_id: t.user_id }}
                      confirmMessage={`هل أنت متأكد من رغبتك في حذف المدرس "${profile?.full_name}"؟ هذا الإجراء نهائي ولا يمكن التراجع عنه.`}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {(teachers ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                لا يوجد مدرسون بعد
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </DataCard>
    </PageShell>
  );
}
