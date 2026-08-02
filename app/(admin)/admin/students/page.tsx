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
import { CreateStudentForm } from "./CreateStudentForm";
import { toggleStudentActive } from "./actions";

export default async function AdminStudentsPage() {
  const supabase = createAdminClient();

  const [{ data: students }, { data: classes }] = await Promise.all([
    supabase
      .from("students")
      .select(
        "user_id, student_code, branch, is_active, parent_id, classes(class_name), profiles!students_user_id_fkey(full_name)",
      )
      .order("user_id", { ascending: false }),
    supabase.from("classes").select("id, class_name").order("id"),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">إدارة الطلاب</h1>

      <CreateStudentForm classes={classes ?? []} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">الاسم</TableHead>
            <TableHead className="text-right">كود الطالب</TableHead>
            <TableHead className="text-right">الصف</TableHead>
            <TableHead className="text-right">الشعبة</TableHead>
            <TableHead className="text-right">ولي الأمر</TableHead>
            <TableHead className="text-right">الحالة</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(students ?? []).map((s) => (
            <TableRow key={s.user_id}>
              <TableCell>
                {(s.profiles as unknown as { full_name: string })?.full_name}
              </TableCell>
              <TableCell dir="ltr" className="text-right font-mono">
                {s.student_code}
              </TableCell>
              <TableCell>
                {(s.classes as unknown as { class_name: string })?.class_name}
              </TableCell>
              <TableCell>{s.branch === "Arabic" ? "عربي" : "لغات"}</TableCell>
              <TableCell>
                {s.parent_id ? <Badge>مربوط</Badge> : <Badge variant="outline">غير مربوط</Badge>}
              </TableCell>
              <TableCell>
                {s.is_active ? (
                  <Badge>نشط</Badge>
                ) : (
                  <Badge variant="destructive">موقوف</Badge>
                )}
              </TableCell>
              <TableCell>
                <form action={toggleStudentActive}>
                  <input type="hidden" name="student_id" value={s.user_id} />
                  <input
                    type="hidden"
                    name="is_active"
                    value={String(s.is_active)}
                  />
                  <Button variant="outline" size="xs" type="submit">
                    {s.is_active ? "إيقاف" : "تفعيل"}
                  </Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {(students ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                مفيش طلاب لسه
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
