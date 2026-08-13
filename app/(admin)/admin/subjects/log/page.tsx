import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/components/shared/BackLink";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ACTION_LABEL: Record<string, { label: string; variant: "default" | "destructive" | "secondary" }> = {
  enrolled: { label: "تسجيل", variant: "default" },
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
    <div className="space-y-6">
      <BackLink href="/admin/subjects" label="رجوع للمواد" />
      <div>
        <h1 className="text-2xl font-bold">سجل تسجيل المواد</h1>
        <p className="text-muted-foreground">
          آخر 200 عملية تسجيل/إلغاء/استرجاع مادة لأي طالب
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">الطالب</TableHead>
            <TableHead className="text-right">المادة</TableHead>
            <TableHead className="text-right">العملية</TableHead>
            <TableHead className="text-right">السبب</TableHead>
            <TableHead className="text-right">الوقت</TableHead>
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
              variant: "secondary" as const,
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
                <TableCell dir="ltr" className="text-right">
                  {new Date(log.action_date).toLocaleString("ar-EG")}
                </TableCell>
              </TableRow>
            );
          })}
          {(logs ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                مفيش عمليات مسجلة لسه
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
