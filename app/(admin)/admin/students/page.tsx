import { createAdminClient } from "@/lib/supabase/admin";
import { CreateStudentForm } from "./CreateStudentForm";
import { StudentsTable, type StudentRow } from "./StudentsTable";

export default async function AdminStudentsPage() {
  const supabase = createAdminClient();

  const [{ data: students }, { data: classes }] = await Promise.all([
    supabase
      .from("students")
      .select(
        "user_id, student_code, branch, is_active, parent_id, classes(class_name), profiles!students_user_id_fkey(full_name, phone)",
      )
      .order("user_id", { ascending: false }),
    supabase.from("classes").select("id, class_name").order("id"),
  ]);

  const rows: StudentRow[] = (students ?? []).map((s) => ({
    user_id: s.user_id,
    student_code: s.student_code,
    branch: s.branch,
    is_active: s.is_active,
    parent_id: s.parent_id,
    full_name:
      (s.profiles as unknown as { full_name: string; phone: string | null })
        ?.full_name ?? "",
    phone:
      (s.profiles as unknown as { full_name: string; phone: string | null })
        ?.phone ?? null,
    class_name:
      (s.classes as unknown as { class_name: string })?.class_name ?? null,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">إدارة الطلاب</h1>

      <CreateStudentForm classes={classes ?? []} />

      <StudentsTable students={rows} />
    </div>
  );
}
