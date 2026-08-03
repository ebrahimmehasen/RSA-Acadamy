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
import { EditParentForm } from "./EditParentForm";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{profile?.full_name}</h1>
        <p className="text-muted-foreground">
          {parent.is_active ? <Badge>نشط</Badge> : <Badge variant="destructive">موقوف</Badge>}
        </p>
      </div>

      <EditParentForm
        parentId={parentId}
        fullName={profile?.full_name}
        email={authUser?.user?.email ?? ""}
        phone={profile?.phone ?? null}
        address={parent.address}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الأبناء المربوطين</CardTitle>
          <CardDescription>{(children ?? []).length} ابن/ابنة</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(children ?? []).map((c) => {
            const childProfile = c.profiles as unknown as { full_name: string };
            return (
              <Badge key={c.user_id} variant="secondary">
                {childProfile?.full_name} ({c.student_code})
              </Badge>
            );
          })}
          {(children ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">مفيش أبناء مربوطين لسه</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
