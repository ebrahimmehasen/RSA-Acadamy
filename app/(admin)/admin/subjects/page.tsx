import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { SELECT_CLASS } from "@/lib/ui";
import { AddSubjectForm } from "./AddSubjectForm";
import { EditSubjectName } from "./EditSubjectName";
import { toggleSubject } from "./actions";

const PAGE_SIZE = 30;

interface Filters {
  class_id?: string;
  branch?: string;
  status?: string;
  q?: string;
  page?: string;
}

function buildHref(filters: Filters, page: number): string {
  const params = new URLSearchParams();
  if (filters.class_id) params.set("class_id", filters.class_id);
  if (filters.branch) params.set("branch", filters.branch);
  if (filters.status) params.set("status", filters.status);
  if (filters.q) params.set("q", filters.q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/admin/subjects?${qs}` : "/admin/subjects";
}

export default async function AdminSubjectsPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const filters = await searchParams;
  const supabase = createAdminClient();

  const classId = filters.class_id ? Number(filters.class_id) : null;
  const branch =
    filters.branch === "Arabic" || filters.branch === "Languages"
      ? filters.branch
      : null;
  const status =
    filters.status === "active" || filters.status === "inactive"
      ? filters.status
      : null;
  const q = filters.q?.trim() || null;
  const page = Math.max(1, Number(filters.page) || 1);

  const [{ data: classes }, subjectsResult] = await Promise.all([
    supabase.from("classes").select("id, class_name").order("id"),
    (() => {
      let query = supabase
        .from("subjects")
        .select("subject_id, subject_name, branch, is_active, classes(class_name)", {
          count: "exact",
        })
        .order("class_id")
        .order("subject_name");

      if (classId) query = query.eq("class_id", classId);
      if (branch) query = query.eq("branch", branch);
      if (status) query = query.eq("is_active", status === "active");
      if (q) query = query.ilike("subject_name", `%${q}%`);

      const from = (page - 1) * PAGE_SIZE;
      return query.range(from, from + PAGE_SIZE - 1);
    })(),
  ]);

  const subjects = subjectsResult.data ?? [];
  const total = subjectsResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PageShell>
      <PageHeader
        title="إدارة المواد الدراسية"
        description={`${total} مادة في الكتالوج — يُسجَّل طلاب الفصل الجدد تلقائيًا في مواد فصلهم وشعبتهم`}
        action={
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/admin/subjects/log">سجل التسجيل 📋</Link>}
          />
        }
      />

      <SectionCard title="إضافة مادة جديدة">
        <AddSubjectForm classes={classes ?? []} />
      </SectionCard>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">كتالوج المواد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" method="get">
            <div className="space-y-1 lg:col-span-2">
              <Label htmlFor="q">بحث بالاسم</Label>
              <Input id="q" name="q" defaultValue={filters.q ?? ""} placeholder="اسم المادة…" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="class_id">الصف</Label>
              <select
                id="class_id"
                name="class_id"
                defaultValue={filters.class_id ?? ""}
                className={SELECT_CLASS}
              >
                <option value="">كل الصفوف</option>
                {(classes ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="branch">الشعبة</Label>
              <select
                id="branch"
                name="branch"
                defaultValue={filters.branch ?? ""}
                className={SELECT_CLASS}
              >
                <option value="">كل الشعب</option>
                <option value="Arabic">عربي</option>
                <option value="Languages">لغات</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="status">الحالة</Label>
              <select
                id="status"
                name="status"
                defaultValue={filters.status ?? ""}
                className={SELECT_CLASS}
              >
                <option value="">الكل</option>
                <option value="active">نشط</option>
                <option value="inactive">موقوف</option>
              </select>
            </div>
            <div className="flex items-end gap-2 lg:col-span-5">
              <Button type="submit" size="sm">
                تصفية
              </Button>
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/admin/subjects">مسح الفلاتر</Link>}
              />
            </div>
          </form>

          <div className="-mx-4 overflow-x-auto sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المادة</TableHead>
                <TableHead>الصف</TableHead>
                <TableHead>الشعبة</TableHead>
                <TableHead>الكود</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((s) => (
                <TableRow key={s.subject_id}>
                  <TableCell>
                    <EditSubjectName
                      subjectId={s.subject_id}
                      subjectName={s.subject_name}
                    />
                  </TableCell>
                  <TableCell>
                    {(s.classes as unknown as { class_name: string })?.class_name}
                  </TableCell>
                  <TableCell>{s.branch === "Arabic" ? "عربي" : "لغات"}</TableCell>
                  <TableCell dir="ltr" className="text-start font-mono text-xs">
                    {s.subject_id}
                  </TableCell>
                  <TableCell>
                    {s.is_active ? (
                      <Badge variant="success">نشط</Badge>
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
                      <Button variant="outline" size="sm" type="submit">
                        {s.is_active ? "إيقاف" : "تفعيل"}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
              {subjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    لا توجد نتائج مطابقة
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <p className="text-sm text-muted-foreground">
                صفحة {page} من {totalPages}
              </p>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="xs"
                    render={<Link href={buildHref(filters, p)}>{p}</Link>}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
