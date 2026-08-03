import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddSubjectForm } from "./AddSubjectForm";
import { toggleSubject } from "./actions";

export default async function AdminSubjectsPage() {
  const supabase = createAdminClient();

  const [{ data: classes }, { data: subjects }] = await Promise.all([
    supabase.from("classes").select("id, class_name").order("id"),
    supabase
      .from("subjects")
      .select("subject_id, subject_name, branch, is_active, classes(class_name)")
      .order("class_id"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">إدارة المواد الدراسية</h1>
          <p className="text-muted-foreground">
            {(subjects ?? []).length} مادة في الكتالوج — طلاب الفصل الجدد
            بيتسجلوا تلقائيًا في مواد فصلهم وشعبتهم
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/admin/subjects/log">سجل التسجيل 📋</Link>}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">إضافة مادة جديدة</CardTitle>
        </CardHeader>
        <CardContent>
          <AddSubjectForm classes={classes ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">كتالوج المواد</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">المادة</TableHead>
                <TableHead className="text-right">الصف</TableHead>
                <TableHead className="text-right">الشعبة</TableHead>
                <TableHead className="text-right">الكود</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(subjects ?? []).map((s) => (
                <TableRow key={s.subject_id}>
                  <TableCell>{s.subject_name}</TableCell>
                  <TableCell>
                    {(s.classes as unknown as { class_name: string })?.class_name}
                  </TableCell>
                  <TableCell>{s.branch === "Arabic" ? "عربي" : "لغات"}</TableCell>
                  <TableCell dir="ltr" className="text-right font-mono text-xs">
                    {s.subject_id}
                  </TableCell>
                  <TableCell>
                    {s.is_active ? (
                      <Badge>نشط</Badge>
                    ) : (
                      <Badge variant="outline">موقوف</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <form action={toggleSubject}>
                      <input type="hidden" name="subject_id" value={s.subject_id} />
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
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
