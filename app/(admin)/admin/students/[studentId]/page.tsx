import { notFound } from "next/navigation";
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
import { EditStudentForm } from "./EditStudentForm";
import { GradeEditForm } from "./GradeEditForm";
import { adminUpdateAssignmentGrade, adminUpdateQuizGrade } from "./actions";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { AdminEditLogCard } from "@/components/shared/AdminEditLogCard";

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId: studentIdParam } = await params;
  const studentId = Number(studentIdParam);
  if (!Number.isInteger(studentId) || studentId <= 0) notFound();

  const supabase = createAdminClient();

  const [
    { data: student },
    { data: classes },
    { data: parents },
    { data: subjects },
    { data: assignmentSubs },
    { data: quizSubs },
  ] = await Promise.all([
    supabase
      .from("students")
      .select(
        "user_id, student_code, class_id, branch, parent_id, is_active, date_of_birth, profiles!students_user_id_fkey(full_name, phone, user_id)",
      )
      .eq("user_id", studentId)
      .maybeSingle(),
    supabase.from("classes").select("id, class_name").order("id"),
    supabase
      .from("parents")
      .select("user_id, profiles!parents_user_id_fkey(full_name)")
      .order("user_id"),
    supabase
      .from("student_subjects")
      .select("subject_id, subjects(subject_name, branch)")
      .eq("student_id", studentId)
      .eq("is_active", true),
    supabase
      .from("assignment_submissions")
      .select(
        "id, grade, status, is_late, submitted_at, assignments(title, max_grade, subjects(subject_name))",
      )
      .eq("student_id", studentId)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("quiz_submissions")
      .select(
        "id, total_score, max_score, status, submitted_at, quizzes(title, subjects(subject_name))",
      )
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }),
  ]);

  if (!student) notFound();

  const profile = student.profiles as unknown as {
    full_name: string;
    phone: string | null;
    user_id: string;
  };
  const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);

  const parentOptions = (parents ?? []).map((p) => ({
    id: p.user_id,
    full_name:
      (p.profiles as unknown as { full_name: string })?.full_name ?? "—",
  }));

  return (
    <PageShell>
      <PageHeader
        title={profile?.full_name}
        backHref="/admin/students"
        backLabel="رجوع للطلاب"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span>
              كود الطالب:{" "}
              <span className="font-mono" dir="ltr">
                {student.student_code}
              </span>
            </span>
            {student.is_active ? (
              <Badge variant="success">نشط</Badge>
            ) : (
              <Badge variant="destructive">موقوف</Badge>
            )}
          </span>
        }
      />

      <EditStudentForm
        studentId={studentId}
        fullName={profile?.full_name}
        email={authUser?.user?.email ?? ""}
        phone={profile?.phone ?? null}
        classId={student.class_id}
        branch={student.branch}
        parentId={student.parent_id}
        classes={classes ?? []}
        parents={parentOptions}
      />

      <SectionCard
        title="موادّه الدراسية"
        description={`${(subjects ?? []).length} مادة`}
        contentClassName="flex flex-wrap gap-2"
      >
        {(subjects ?? []).map((s) => {
          const subject = s.subjects as unknown as { subject_name: string };
          return (
            <Badge key={s.subject_id} variant="secondary">
              {subject?.subject_name}
            </Badge>
          );
        })}
        {(subjects ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">لا توجد مواد مسجَّلة له</p>
        )}
      </SectionCard>

      <SectionCard title="درجات الواجبات" contentClassName="-mx-4 overflow-x-auto sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الواجب</TableHead>
                <TableHead>المادة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الدرجة</TableHead>
                <TableHead />
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
                    <TableCell>
                      <GradeEditForm
                        action={adminUpdateAssignmentGrade}
                        hiddenFields={{ submission_id: sub.id, student_id: studentId }}
                        gradeFieldName="grade"
                        defaultValue={sub.grade}
                        max={assignment?.max_grade ?? 100}
                      />
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
                <TableHead />
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
                        <Badge variant="outline">لم يُحلّ بعد</Badge>
                      )}
                    </TableCell>
                    <TableCell dir="ltr">
                      {sub.total_score ?? "—"}/{sub.max_score}
                    </TableCell>
                    <TableCell>
                      <GradeEditForm
                        action={adminUpdateQuizGrade}
                        hiddenFields={{ submission_id: sub.id, student_id: studentId }}
                        gradeFieldName="score"
                        defaultValue={sub.total_score}
                        max={sub.max_score}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {(quizSubs ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    لا توجد تسليمات اختبارات بعد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </SectionCard>

      <AdminEditLogCard targetType="student" targetId={studentId} />
    </PageShell>
  );
}
