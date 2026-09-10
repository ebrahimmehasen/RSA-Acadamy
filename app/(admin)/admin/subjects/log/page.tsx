import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
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
import { DataCard } from "@/components/shared/DataCard";

const ACTION_LABEL: Record<
  string,
  { label: string; variant: "success" | "destructive" | "secondary" }
> = {
  enrolled: { label: "تسجيل", variant: "success" },
  removed: { label: "إلغاء", variant: "destructive" },
  restored: { label: "استرجاع", variant: "secondary" },
};

export default async function SubjectEnrollmentLogPage() {
  const supabase = createAdminClient();

  const { data: logs } = await supabase
    .from("subject_enrollment_log")
    .select(
      "id, subject_id, action, action_date, reason, students!subject_enrollment_log_student_id_fkey(student_code, profiles!students_user_id_fkey(full_name)), subjects!subject_enrollment_log_subject_id_fkey(subject_name)",
    )
    .order("action_date", { ascending: false })
    .limit(200);

  return (
    <PageShell>
      <PageHeader
        title="سجل تسجيل المواد"
        description="آخر 200 عملية تسجيل/إلغاء/استرجاع مادة لأي طالب"
        backHref="/admin/subjects"
        backLabel="رجوع للمواد"
      />
      <DataCard title="العمليات" count={(logs ?? []).length}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الطالب</TableHead>
            <TableHead>المادة</TableHead>
            <TableHead>العملية</TableHead>
            <TableHead>السبب</TableHead>
            <TableHead>الوقت</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(logs ?? []).map((log) => {
            const student = log.students as unknown as {
              student_code: string;
              profiles: { full_name: string };
            };
            const subject = log.subjects as unknown as { subject_name: string };
            const action = ACTION_LABEL[log.action] ?? {
              label: log.action,
              variant: "secondary" as "success" | "destructive" | "secondary",
            };
            return (
              <TableRow key={log.id}>
                <TableCell>
                  {student?.profiles?.full_name}{" "}
                  <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                    ({student?.student_code})
                  </span>
                </TableCell>
                <TableCell>{subject?.subject_name ?? log.subject_id}</TableCell>
                <TableCell>
                  <Badge variant={action.variant}>{action.label}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {log.reason ?? "—"}
                </TableCell>
                <TableCell dir="ltr" className="text-start">
                  {new Date(log.action_date).toLocaleString("ar-EG")}
                </TableCell>
              </TableRow>
            );
          })}
          {(logs ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                لا توجد عمليات مسجلة بعد
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </DataCard>
    </PageShell>
  );
}
