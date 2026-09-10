import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditParentForm } from "./EditParentForm";
import { LinkChildForm } from "./LinkChildForm";
import { unlinkChild } from "./actions";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionCard } from "@/components/shared/SectionCard";
import { AdminEditLogCard } from "@/components/shared/AdminEditLogCard";

export default async function AdminParentDetailPage({
  params,
}: {
  params: Promise<{ parentId: string }>;
}) {
  const { parentId: parentIdParam } = await params;
  const parentId = Number(parentIdParam);
  if (!Number.isInteger(parentId) || parentId <= 0) notFound();

  const supabase = createAdminClient();

  const [{ data: parent }, { data: children }] = await Promise.all([
    supabase
      .from("parents")
      .select(
        "user_id, address, is_active, profiles!parents_user_id_fkey(full_name, phone, user_id)",
      )
      .eq("user_id", parentId)
      .maybeSingle(),
    supabase
      .from("students")
      .select("user_id, student_code, profiles!students_user_id_fkey(full_name)")
      .eq("parent_id", parentId),
  ]);

  if (!parent) notFound();

  const profile = parent.profiles as unknown as {
    full_name: string;
    phone: string | null;
    user_id: string;
  };
  const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);

  return (
    <PageShell>
      <PageHeader
        title={profile?.full_name}
        backHref="/admin/parents"
        backLabel="رجوع لأولياء الأمور"
        description={
          parent.is_active ? (
            <Badge variant="success">نشط</Badge>
          ) : (
            <Badge variant="destructive">موقوف</Badge>
          )
        }
      />

      <EditParentForm
        parentId={parentId}
        fullName={profile?.full_name}
        email={authUser?.user?.email ?? ""}
        phone={profile?.phone ?? null}
        address={parent.address}
      />

      <SectionCard
        title="الأبناء المربوطين"
        description={`${(children ?? []).length} ابن/ابنة`}
        contentClassName="space-y-4"
      >
          <div className="space-y-2">
            {(children ?? []).map((c) => {
              const childProfile = c.profiles as unknown as { full_name: string };
              return (
                <div
                  key={c.user_id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2"
                >
                  <Badge variant="secondary">
                    {childProfile?.full_name} ({c.student_code})
                  </Badge>
                  <form action={unlinkChild}>
                    <input type="hidden" name="student_id" value={c.user_id} />
                    <input type="hidden" name="parent_id" value={parentId} />
                    <Button variant="destructive" size="sm" type="submit">
                      إزالة ابن
                    </Button>
                  </form>
                </div>
              );
            })}
            {(children ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">لا يوجد أبناء مربوطون بعد</p>
            )}
          </div>

          <LinkChildForm parentId={parentId} />
      </SectionCard>

      <AdminEditLogCard targetType="parent" targetId={parentId} />
    </PageShell>
  );
}
