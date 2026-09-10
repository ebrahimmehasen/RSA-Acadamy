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
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { SignOutButton } from "@/components/shared/SignOutButton";
import { ProfileForm } from "@/app/settings/profile/ProfileForm";

export default async function StudentProfilePage() {
  const session = await getSession();
  const supabase = await createClient();

  const [{ data: student }, { data: subjects }, { data: authData }] = await Promise.all([
    supabase
      .from("students")
      .select("*, classes(class_name)")
      .eq("user_id", session!.profile.id)
      .single(),
    supabase
      .from("student_subjects")
      .select("subject_id, subjects(subject_name, branch)")
      .eq("student_id", session!.profile.id)
      .eq("is_active", true),
    supabase.auth.getUser(),
  ]);

  return (
    <PageShell>
      <PageHeader title="الملف الشخصي" />

      <ProfileForm
        fullName={session!.profile.full_name}
        phone={session!.profile.phone}
        email={authData.user?.email ?? ""}
        pictureDriveId={session!.profile.profile_picture_drive_id}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">بيانات الطالب</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            كود الطالب:{" "}
            <span className="font-mono font-bold" dir="ltr">
              {student?.student_code}
            </span>
          </p>
          <p>
            الصف:{" "}
            {(student?.classes as unknown as { class_name: string })?.class_name}
          </p>
          <p>الشعبة: {student?.branch === "Arabic" ? "عربي" : "لغات"}</p>
          <p>
            ولي الأمر:{" "}
            {student?.parent_id ? (
              <Badge>مرتبط</Badge>
            ) : (
              <Badge variant="outline">غير مرتبط</Badge>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">موادك الدراسية</CardTitle>
          <CardDescription>{(subjects ?? []).length} مادة</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(subjects ?? []).map((s) => {
            const subject = s.subjects as unknown as {
              subject_name: string;
            };
            return (
              <Badge key={s.subject_id} variant="secondary">
                {subject?.subject_name}
              </Badge>
            );
          })}
        </CardContent>
      </Card>

      <SectionCard title="الجلسة" description="تسجيل الخروج من هذا الجهاز">
        <SignOutButton variant="outline" size="touch" />
      </SectionCard>
    </PageShell>
  );
}
