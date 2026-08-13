import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { GradebookTable, type StudentRow, type ColumnHeader } from "./GradebookTable";

export default async function TeacherGradebookPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const { classId: classIdParam } = await searchParams;
  const session = await getSession();
  const supabase = await createClient();

  // RLS scopes class_assignments to this teacher's own slots
  const { data: slots } = await supabase
    .from("class_assignments")
    .select("class_id, classes(class_name)")
    .eq("is_active", true);

  const classById = new Map<number, string>();
  for (const s of slots ?? []) {
    const cls = s.classes as unknown as { class_name: string } | null;
    if (cls) classById.set(s.class_id, cls.class_name);
  }
  const classes = [...classById.entries()]
    .map(([id, class_name]) => ({ id, class_name }))
    .sort((a, b) => a.id - b.id);

  const classId = classIdParam ? Number(classIdParam) : classes[0]?.id;

  let students: StudentRow[] = [];
  let assignmentHeaders: ColumnHeader[] = [];
  let quizHeaders: ColumnHeader[] = [];

  if (classId) {
    const [{ data: studentRows }, { data: assignments }, { data: quizzes }] =
      await Promise.all([
        supabase
          .from("students")
          .select("user_id, student_code, profiles!students_user_id_fkey(full_name)")
          .eq("class_id", classId)
          .eq("is_active", true)
          .order("user_id"),
        supabase
          .from("assignments")
          .select("id, title, max_grade, due_date")
          .eq("teacher_id", session!.profile.id)
          .eq("class_id", classId)
          .order("due_date"),
        supabase
          .from("quizzes")
          .select("id, title, total_points")
          .eq("teacher_id", session!.profile.id)
          .eq("class_id", classId)
          .order("start_time"),
      ]);

    const assignmentIds = (assignments ?? []).map((a) => a.id);
    const quizIds = (quizzes ?? []).map((q) => q.id);

    const [{ data: aSubs }, { data: qSubs }] = await Promise.all([
      assignmentIds.length
        ? supabase
            .from("assignment_submissions")
            .select("assignment_id, student_id, grade, status, is_late")
            .in("assignment_id", assignmentIds)
        : Promise.resolve({ data: [] as { assignment_id: number; student_id: number; grade: number | null; status: string; is_late: boolean }[] }),
      quizIds.length
        ? supabase
            .from("quiz_submissions")
            .select("quiz_id, student_id, total_score, max_score, status")
            .in("quiz_id", quizIds)
        : Promise.resolve({ data: [] as { quiz_id: number; student_id: number; total_score: number | null; max_score: number; status: string }[] }),
    ]);

    const now = new Date();
    assignmentHeaders = (assignments ?? []).map((a) => ({
      id: a.id,
      label: a.title,
      max: a.max_grade,
    }));
    quizHeaders = (quizzes ?? []).map((q) => ({
      id: q.id,
      label: q.title,
      max: q.total_points,
    }));

    students = (studentRows ?? []).map((s) => {
      const profile = s.profiles as unknown as { full_name: string };

      let lateCount = 0;
      const assignmentCells = (assignments ?? []).map((a) => {
        const sub = (aSubs ?? []).find(
          (x) => x.assignment_id === a.id && x.student_id === s.user_id,
        );
        if (sub) {
          if (sub.is_late) lateCount++;
          if (sub.status === "graded" && sub.grade !== null) {
            return {
              value: sub.grade,
              max: a.max_grade,
              status: sub.is_late ? ("late" as const) : ("graded" as const),
            };
          }
          return {
            value: null,
            max: a.max_grade,
            status: sub.is_late ? ("late" as const) : ("submitted" as const),
          };
        }
        return {
          value: null,
          max: a.max_grade,
          status: new Date(a.due_date) < now ? ("missing" as const) : ("pending" as const),
        };
      });

      const quizCells = (quizzes ?? []).map((q) => {
        const sub = (qSubs ?? []).find(
          (x) => x.quiz_id === q.id && x.student_id === s.user_id,
        );
        if (sub) {
          if (sub.status === "graded" && sub.total_score !== null) {
            return { value: sub.total_score, max: q.total_points, status: "graded" as const };
          }
          return { value: null, max: q.total_points, status: "submitted" as const };
        }
        return { value: null, max: q.total_points, status: "missing" as const };
      });

      const gradedAssignments = assignmentCells.filter((c) => c.value !== null);
      const gradedQuizzes = quizCells.filter((c) => c.value !== null);
      const avgAssignment = gradedAssignments.length
        ? Math.round(
            (gradedAssignments.reduce((sum, c) => sum + (c.value! / c.max) * 100, 0) /
              gradedAssignments.length) *
              10,
          ) / 10
        : null;
      const avgQuiz = gradedQuizzes.length
        ? Math.round(
            (gradedQuizzes.reduce((sum, c) => sum + (c.value! / c.max) * 100, 0) /
              gradedQuizzes.length) *
              10,
          ) / 10
        : null;
      const allGraded = [...gradedAssignments, ...gradedQuizzes];
      const overallAvg = allGraded.length
        ? Math.round(
            (allGraded.reduce((sum, c) => sum + (c.value! / c.max) * 100, 0) /
              allGraded.length) *
              10,
          ) / 10
        : null;

      return {
        id: s.user_id,
        name: profile?.full_name ?? "—",
        code: s.student_code,
        assignmentCells,
        quizCells,
        avgAssignment,
        avgQuiz,
        overallAvg,
        lateCount,
      };
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">كشف الدرجات</h1>
        <p className="text-muted-foreground">
          درجات الواجبات والاختبارات لكل طلاب الصف، مع حالة التسليم وعدد مرات التأخير
        </p>
      </div>

      {classes.length === 0 ? (
        <p className="text-muted-foreground">
          الإدارة لسه موزعتلكش حصص في الجدول — كشف الدرجات هيظهر أول ما يبقى عندك فصول.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {classes.map((c) => (
              <Link
                key={c.id}
                href={`/teacher/gradebook?classId=${c.id}`}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm",
                  c.id === classId
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-accent",
                )}
              >
                {c.class_name}
              </Link>
            ))}
          </div>

          <GradebookTable
            students={students}
            assignmentHeaders={assignmentHeaders}
            quizHeaders={quizHeaders}
          />
        </>
      )}
    </div>
  );
}
