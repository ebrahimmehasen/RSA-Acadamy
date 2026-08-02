import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الفصول والجدول الدراسي</h1>
        <p className="text-muted-foreground">
          اختر فصلًا لإدارة جدوله الأسبوعي وروابط Zoom
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(classes ?? []).map((cls) => (
          <Link key={cls.id} href={`/admin/classes/${cls.id}`}>
            <Card className="transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle className="text-base">{cls.class_name}</CardTitle>
                <CardDescription>
                  {cls.class_short} · {countByClass.get(cls.id) ?? 0} حصة
                  أسبوعيًا
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
