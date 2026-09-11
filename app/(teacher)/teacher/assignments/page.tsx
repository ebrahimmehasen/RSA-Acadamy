import Link from "next/link";
import { ClipboardList, Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageShell } from "@/components/shared/PageShell";
import { CARD_LINK_CLASS } from "@/lib/ui";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { CreateAssignmentToggle } from "./CreateAssignmentToggle";

export default async function TeacherAssignmentsPage() {
  const session = await getSession();
  const supabase = await createClient();

  const [{ data: slots }, { data: assignments }, { data: submissions }] =
    await Promise.all([
      supabase
        .from("class_assignments")
        .select("class_id, subject_id, classes(class_name), subjects(subject_name)")
        .eq("teacher_id", session!.profile.id)
        .eq("is_active", true),
      supabase
        .from("assignments")
        .select(
          "id, title, due_date, max_grade, branch, created_at, attachment_drive_ids, classes(class_name), subjects(subject_name)",
        )
        .eq("teacher_id", session!.profile.id)
        .order("due_date", { ascending: false }),
      supabase
        .from("assignment_submissions")
        .select("assignment_id, status"),
    ]);

  // dedupe class+subject combos this teacher actually teaches
  const seen = new Set<string>();
  const uniqueSlots = (slots ?? [])
    .filter((s) => {
      const key = `${s.class_id}|${s.subject_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((s) => ({
      classId: s.class_id,
      className: (s.classes as unknown as { class_name: string })?.class_name,
      subjectId: s.subject_id,
      subjectName: (s.subjects as unknown as { subject_name: string })?.subject_name,
    }));

  const pendingCountByAssignment = new Map<number, number>();
  for (const sub of submissions ?? []) {
    if (sub.status === "submitted") {
      pendingCountByAssignment.set(
        sub.assignment_id,
        (pendingCountByAssignment.get(sub.assignment_id) ?? 0) + 1,
      );
    }
  }

  return (
    <PageShell>
      <PageHeader title="الواجبات" description={`${(assignments ?? []).length} واجب`} />

      <div className="grid gap-[var(--card-gap)]">
        {(assignments ?? []).map((a) => {
          const isOpen = new Date(a.due_date) > new Date();
          const attachmentCount = Array.isArray(a.attachment_drive_ids)
            ? a.attachment_drive_ids.length
            : 0;
          return (
            <Link
              key={a.id}
              href={`/teacher/assignments/${a.id}`}
              className={CARD_LINK_CLASS}
            >
              <Card className="transition-colors hover:bg-muted/40">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="min-w-0 flex-1 truncate text-base">
                      {a.title}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      {a.branch && (
                        <Badge variant="info">
                          {a.branch === "Arabic" ? "شعبة العربي فقط" : "شعبة اللغات فقط"}
                        </Badge>
                      )}
                      {(pendingCountByAssignment.get(a.id) ?? 0) > 0 && (
                        <Badge variant="warning">
                          {pendingCountByAssignment.get(a.id)} بانتظار التصحيح
                        </Badge>
                      )}
                      <Badge variant={isOpen ? "success" : "secondary"}>
                        {isOpen ? "مفتوح للتسليم" : "انتهى الموعد"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    {(a.classes as unknown as { class_name: string })?.class_name}
                    {" · "}
                    {(a.subjects as unknown as { subject_name: string })?.subject_name}
                    {" · الدرجة العظمى: "}
                    {a.max_grade}
                  </p>
                  <p>
                    {"تاريخ الإنشاء: "}
                    {new Date(a.created_at).toLocaleDateString("ar-EG")}
                    {" · آخر موعد: "}
                    {new Date(a.due_date).toLocaleDateString("ar-EG")}
                    {attachmentCount > 0 && (
                      <span className="ms-2 inline-flex items-center gap-1">
                        <Paperclip className="size-3.5" aria-hidden="true" />
                        {attachmentCount}
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {(assignments ?? []).length === 0 && (
          <EmptyState icon={ClipboardList} title="لا توجد واجبات بعد" />
        )}
      </div>

      <CreateAssignmentToggle slots={uniqueSlots} />
    </PageShell>
  );
}
