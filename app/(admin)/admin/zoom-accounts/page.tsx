import { createAdminClient } from "@/lib/supabase/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDeleteButton } from "@/components/shared/ConfirmDeleteButton";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { DataCard } from "@/components/shared/DataCard";
import { AddZoomAccountForm } from "./AddZoomAccountForm";
import { deleteZoomAccount } from "./actions";

export default async function AdminZoomAccountsPage() {
  const supabase = createAdminClient();
  const { data: accounts } = await supabase
    .from("zoom_accounts")
    .select("*")
    .order("id");

  return (
    <PageShell>
      <PageHeader
        title="حسابات زووم"
        description="القائمة الثابتة لروابط زووم التي تظهر للاختيار مباشرةً عند بناء جدول الفصول، بدل كتابة الرابط ومعرّف الاجتماع وكلمة السر يدويًا في كل مرة"
      />

      <SectionCard title="إضافة حساب جديد">
        <AddZoomAccountForm />
      </SectionCard>

      <DataCard title="الحسابات المتاحة" count={(accounts ?? []).length}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>الرابط</TableHead>
                <TableHead>Meeting ID</TableHead>
                <TableHead>Passcode</TableHead>
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
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    لا توجد حسابات زووم بعد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </DataCard>
    </PageShell>
  );
}
