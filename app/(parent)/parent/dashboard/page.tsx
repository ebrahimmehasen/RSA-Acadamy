import { UsersRound, BarChart3 } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatGrid } from "@/components/shared/StatGrid";
import { StatCard } from "@/components/shared/StatCard";

export default async function ParentDashboard() {
  const session = await getSession();

  return (
    <PageShell>
      <PageHeader title={`أهلاً ${session?.profile.full_name} 👋`} />
      <StatGrid cols={2}>
        <StatCard
          label="الأبناء"
          value="—"
          icon={UsersRound}
          hint="اربط أبناءك بكود الطالب من صفحة الأبناء"
          href="/parent/children"
        />
        <StatCard
          label="التقارير"
          value="—"
          icon={BarChart3}
          hint="تابع درجات ومستوى أبنائك"
          href="/parent/reports"
        />
      </StatGrid>
    </PageShell>
  );
}
