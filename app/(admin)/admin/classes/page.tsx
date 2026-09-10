import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageShell } from "@/components/shared/PageShell";
import { CARD_LINK_CLASS } from "@/lib/ui";
import { PageHeader } from "@/components/shared/PageHeader";

export default async function AdminClassesPage() {
  const supabase = createAdminClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, class_name, class_short, class_level")
    .order("id");

  const { data: slotCounts } = await supabase
    .from("class_assignments")
    .select("class_id")
    .eq("is_active", true);

  const countByClass = new Map<number, number>();
  for (const row of slotCounts ?? []) {
    countByClass.set(row.class_id, (countByClass.get(row.class_id) ?? 0) + 1);
  }

  return (
    <PageShell>
      <PageHeader
        title="الفصول والجدول الدراسي"
        description="اختر فصلًا لإدارة جدوله الأسبوعي وروابط Zoom"
      />
      <div className="grid grid-cols-1 gap-[var(--card-gap)] sm:grid-cols-2 lg:grid-cols-3">
        {(classes ?? []).map((cls) => (
          <Link
            key={cls.id}
            href={`/admin/classes/${cls.id}`}
            className={CARD_LINK_CLASS}
          >
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardHeader>
                <CardTitle className="text-base">{cls.class_name}</CardTitle>
                <CardDescription>
                  {cls.class_short} · {countByClass.get(cls.id) ?? 0} حصة أسبوعيًا
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
