import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { GraduationCap, FileQuestion, ClipboardCheck, Clock } from "lucide-react";
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
import { SectionCard } from "@/components/shared/SectionCard";
import { StatGrid } from "@/components/shared/StatGrid";
import { StatCard } from "@/components/shared/StatCard";

export default async function TeacherStudentSheetPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId: studentIdParam } = await params;
  const studentId = Number(studentIdParam);
  if (!Number.isInteger(studentId) || studentId <= 0) notFound();

  const session = await getSession();
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select(
      "user_id, student_code, branch, class_id, classes(class_name), profiles!students_user_id_fkey(full_name, phone)",
    )
    .eq("user_id", studentId)
    .maybeSingle();
  if (!student) notFound();

  // RLS scopes these to submissions of assignments/quizzes this teacher
  // created themselves — a teacher only ever sees the grades they gave.
  const [{ data: assignmentSubs }, { data: quizSubs }] = await Promise.all([
    supabase
      .from("assignment_submissions")
      .select(
        "id, grade, status, is_late, submitted_at, assignments!inner(title, max_grade, due_date, teacher_id, subjects(subject_name))",
      )
      .eq("student_id", studentId)
      .eq("assignments.teacher_id", session!.profile.id)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("quiz_submissions")
      .select(
        "id, total_score, max_score, status, submitted_at, quizzes!inner(title, teacher_id, subjects(subject_name))",
      )
      .eq("student_id", studentId)
      .eq("quizzes.teacher_id", session!.profile.id)
      .order("submitted_at", { ascending: false }),
  ]);

  const profile = student.profiles as unknown as { full_name: string; phone: string | null };
  const className = (student.classes as unknown as { class_name: string } | null)?.class_name;

  const lateSubs = (assignmentSubs ?? []).filter((s) => s.is_late);
  const gradedAssignments = (assignmentSubs ?? []).filter((s) => s.grade !== null);
  const gradedQuizzes = (quizSubs ?? []).filter((s) => s.total_score !== null);
  const avgAssignment = gradedAssignments.length
    ? Math.round(
        (gradedAssignments.reduce(
          (sum, s) =>
            sum +
            (s.grade! /
              (s.assignments as unknown as { max_grade: number }).max_grade) *
              100,
          0,
        ) /
          gradedAssignments.length) *
          10,
      ) / 10
    : null;
  const avgQuiz = gradedQuizzes.length
    ? Math.round(
        (gradedQuizzes.reduce(
          (sum, s) => sum + (s.total_score! / s.max_score) * 100,
          0,
        ) /
          gradedQuizzes.length) *
          10,
      ) / 10
    : null;

  return (
    <PageShell>
      <PageHeader
        title={profile?.full_name}
        backHref="/teacher/gradebook"
        backLabel="رجوع لكشف الدرجات"
        description={
          <span>
            كود الطالب:{" "}
            <span className="font-mono" dir="ltr">
              {student.student_code}
            </span>{" "}
            · {className} · {student.branch === "Arabic" ? "عربي" : "لغات"}
            {profile?.phone && (
              <>
                {" · "}
                <span dir="ltr">{profile.phone}</span>
              </>
            )}
          </span>
        }
      />

      <StatGrid cols={4}>
        <StatCard
          label="متوسط الواجبات"
          value={avgAssignment !== null ? `${avgAssignment}%` : "—"}
          icon={GraduationCap}
        />
        <StatCard
          label="متوسط الاختبارات"
          value={avgQuiz !== null ? `${avgQuiz}%` : "—"}
          icon={FileQuestion}
        />
        <StatCard
          label="واجبات تم تسليمها"
          value={(assignmentSubs ?? []).length}
          icon={ClipboardCheck}
        />
        <StatCard
          label="مرات التأخير"
          value={lateSubs.length}
          icon={Clock}
          tone={lateSubs.length > 0 ? "destructive" : "default"}
        />
      </StatGrid>

      <SectionCard title="سجل تسليم الواجبات" contentClassName="-mx-4 overflow-x-auto sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الواجب</TableHead>
                <TableHead>المادة</TableHead>
                <TableHead>تاريخ التسليم</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الدرجة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(assignmentSubs ?? []).map((sub) => {
                const assignment = sub.assignments as unknown as {
                  title: string;
                  max_grade: number;
                  subjects: { subject_name: string } | null;
                };
                return (
                  <TableRow key={sub.id}>
                    <TableCell>{assignment?.title}</TableCell>
                    <TableCell>{assignment?.subjects?.subject_name}</TableCell>
                    <TableCell dir="ltr">
                      {new Date(sub.submitted_at).toLocaleDateString("ar-EG")}
                    </TableCell>
                    <TableCell>
                      {sub.status === "graded" ? (
                        <Badge variant="success">مصحح</Badge>
                      ) : (
                        <Badge variant="secondary">تم التسليم</Badge>
                      )}
                      {sub.is_late && (
                        <Badge variant="destructive" className="mr-1">
                          متأخر
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell dir="ltr">
                      {sub.grade ?? "—"}/{assignment?.max_grade}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(assignmentSubs ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    لا توجد تسليمات واجبات بعد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </SectionCard>

      <SectionCard title="درجات الاختبارات" contentClassName="-mx-4 overflow-x-auto sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاختبار</TableHead>
                <TableHead>المادة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الدرجة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(quizSubs ?? []).map((sub) => {
                const quiz = sub.quizzes as unknown as {
                  title: string;
                  subjects: { subject_name: string } | null;
                };
                return (
                  <TableRow key={sub.id}>
                    <TableCell>{quiz?.title}</TableCell>
                    <TableCell>{quiz?.subjects?.subject_name}</TableCell>
                    <TableCell>
                      {sub.status === "graded" ? (
                        <Badge variant="success">مصحح</Badge>
                      ) : sub.status === "submitted" ? (
                        <Badge variant="secondary">قيد التصحيح</Badge>
                      ) : (
                        <Badge variant="outline">قيد الحل</Badge>
                      )}
                    </TableCell>
                    <TableCell dir="ltr">
                      {sub.total_score ?? "—"}/{sub.max_score}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(quizSubs ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    لا توجد تسليمات اختبارات بعد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </SectionCard>

      <p className="text-xs text-muted-foreground">
        بيانات الحضور غير متاحة في المنصة حاليًا.
      </p>
    </PageShell>
  );
}
