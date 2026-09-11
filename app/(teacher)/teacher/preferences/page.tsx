import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { PreferencesForm, type SubjectRow } from "./PreferencesForm";
import { AvailabilityForm } from "./AvailabilityForm";

export default async function TeacherPreferencesPage() {
  const session = await getSession();
  const supabase = await createClient();

  const [{ data: classes }, { data: subjects }, { data: prefs }, { data: availability }] =
    await Promise.all([
      supabase.from("classes").select("id, class_name").order("id"),
      supabase
        .from("subjects")
        .select("subject_id, subject_name, branch, classes(class_name)")
        .eq("is_active", true)
        .order("class_id"),
      supabase
        .from("teacher_preferences")
        .select("subjects, classes")
        .eq("teacher_id", session!.profile.id)
        .maybeSingle(),
      supabase
        .from("teacher_availability")
        .select("day_of_week, start_time")
        .eq("teacher_id", session!.profile.id),
    ]);

  const typedSubjects = (subjects ?? []) as unknown as {
    subject_id: string;
    subject_name: string;
    branch: "Arabic" | "Languages";
    classes: { class_name: string } | null;
  }[];
  const subjectsByBranch: { Arabic: SubjectRow[]; Languages: SubjectRow[] } = {
    Arabic: [],
    Languages: [],
  };
  for (const s of typedSubjects) {
    const row: SubjectRow = {
      subject_id: s.subject_id,
      subject_name: s.subject_name,
      branch: s.branch,
      class_name: s.classes?.class_name ?? "",
    };
    subjectsByBranch[s.branch].push(row);
  }

  const initialSlots = new Set(
    (availability ?? []).map((a) => `${a.day_of_week}|${a.start_time.slice(0, 5)}`),
  );

  return (
    <PageShell>
      <PageHeader title="التفضيلات" />

      <SectionCard title="التخصص والفصول">
        <PreferencesForm
          subjectsByBranch={subjectsByBranch}
          classes={classes ?? []}
          initialSubjects={(prefs?.subjects as string[]) ?? []}
          initialClasses={(prefs?.classes as number[]) ?? []}
        />
      </SectionCard>

      <SectionCard
        title="أوقات التواجد"
        description="الأوقات التي تستطيع التدريس فيها أسبوعيًا — كل الحصص بتوقيت القاهرة"
      >
        <AvailabilityForm initialSlots={initialSlots} />
      </SectionCard>
    </PageShell>
  );
}
