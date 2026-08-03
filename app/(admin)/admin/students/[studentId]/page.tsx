import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EditStudentForm } from "./EditStudentForm";

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId: studentIdParam } = await params;
  const studentId = Number(studentIdParam);
  if (!Number.isInteger(studentId) || studentId <= 0) notFound();

  const supabase = createAdminClient();

  const [{ data: student }, { data: classes }, { data: parents }, { data: subjects }] =
    await Promise.all([
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{profile?.full_name}</h1>
        <p className="text-muted-foreground">
          كود الطالب: <span className="font-mono" dir="ltr">{student.student_code}</span> ·{" "}
          {student.is_active ? <Badge>نشط</Badge> : <Badge variant="destructive">موقوف</Badge>}
        </p>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">موادّه الدراسية</CardTitle>
          <CardDescription>{(subjects ?? []).length} مادة</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(subjects ?? []).map((s) => {
            const subject = s.subjects as unknown as { subject_name: string };
            return (
              <Badge key={s.subject_id} variant="secondary">
                {subject?.subject_name}
              </Badge>
            );
          })}
          {(subjects ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">مفيش مواد مسجل فيها</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
