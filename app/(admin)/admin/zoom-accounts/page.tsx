import { createAdminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
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
import { ConfirmDeleteButton } from "@/components/shared/ConfirmDeleteButton";
import { AddZoomAccountForm } from "./AddZoomAccountForm";
import { deleteZoomAccount } from "./actions";

export default async function AdminZoomAccountsPage() {
  const supabase = createAdminClient();
  const { data: accounts } = await supabase
    .from("zoom_accounts")
    .select("*")
    .order("id");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">حسابات زووم</h1>
        <p className="text-muted-foreground">
          القائمة الثابتة لروابط زووم التي تظهر للاختيار مباشرةً عند بناء
          جدول الفصول، بدل كتابة الرابط ومعرّف الاجتماع وكلمة السر يدويًا
          في كل مرة
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">إضافة حساب جديد</CardTitle>
        </CardHeader>
        <CardContent>
          <AddZoomAccountForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الحسابات المتاحة</CardTitle>
          <CardDescription>
            {(accounts ?? []).length} حساب
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">الرابط</TableHead>
                <TableHead className="text-right">Meeting ID</TableHead>
                <TableHead className="text-right">Passcode</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(accounts ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.label}</TableCell>
                  <TableCell dir="ltr" className="max-w-xs truncate text-xs">
                    {a.link}
                  </TableCell>
                  <TableCell dir="ltr">{a.meeting_id ?? "—"}</TableCell>
                  <TableCell dir="ltr">{a.passcode ?? "—"}</TableCell>
                  <TableCell>
                    <ConfirmDeleteButton
                      action={deleteZoomAccount}
                      hiddenFields={{ id: a.id }}
                      confirmMessage={`هل أنت متأكد من حذف حساب "${a.label}"؟`}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {(accounts ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    لا توجد حسابات زووم بعد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
