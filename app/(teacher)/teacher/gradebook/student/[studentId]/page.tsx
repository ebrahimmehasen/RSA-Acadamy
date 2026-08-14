import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
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
import { BackLink } from "@/components/shared/BackLink";

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
    <div className="space-y-6">
      <BackLink href="/teacher/gradebook" label="رجوع لكشف الدرجات" />
      <div>
        <h1 className="text-2xl font-bold">{profile?.full_name}</h1>
        <p className="text-muted-foreground">
          كود الطالب: <span className="font-mono" dir="ltr">{student.student_code}</span>
          {" · "}
          {className}
          {" · "}
          {student.branch === "Arabic" ? "عربي" : "لغات"}
          {profile?.phone && (
            <>
              {" · "}
              <span dir="ltr">{profile.phone}</span>
            </>
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>متوسط الواجبات</CardDescription>
            <CardTitle className="text-2xl">
              {avgAssignment !== null ? `${avgAssignment}%` : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>متوسط الاختبارات</CardDescription>
            <CardTitle className="text-2xl">
              {avgQuiz !== null ? `${avgQuiz}%` : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>واجبات تم تسليمها</CardDescription>
            <CardTitle className="text-2xl">{(assignmentSubs ?? []).length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>مرات التأخير</CardDescription>
            <CardTitle
              className={`text-2xl ${lateSubs.length > 0 ? "text-destructive" : ""}`}
            >
              {lateSubs.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">سجل تسليم الواجبات</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الواجب</TableHead>
                <TableHead className="text-right">المادة</TableHead>
                <TableHead className="text-right">تاريخ التسليم</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الدرجة</TableHead>
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
                        <Badge>مصحح</Badge>
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
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    مفيش تسليمات واجبات لسه
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">درجات الاختبارات</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاختبار</TableHead>
                <TableHead className="text-right">المادة</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الدرجة</TableHead>
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
                        <Badge>مصحح</Badge>
                      ) : sub.status === "submitted" ? (
                        <Badge variant="secondary">قيد التصحيح</Badge>
                      ) : (
                        <Badge variant="outline">لسه بيحل</Badge>
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
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    مفيش تسليمات اختبارات لسه
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        بيانات الحضور مش متاحة في المنصة حاليًا.
      </p>
    </div>
  );
}
