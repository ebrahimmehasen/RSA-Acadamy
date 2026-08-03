import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import {
  GraduationCap,
  Video,
  ClipboardCheck,
  BarChart3,
} from "lucide-react";

const FEATURES = [
  {
    icon: GraduationCap,
    title: "متابعة أكاديمية شاملة",
    description: "جدول الحصص، الدرجات، والواجبات في مكان واحد.",
  },
  {
    icon: Video,
    title: "حصص مسجلة",
    description: "مراجعة الشرح في أي وقت من أي جهاز.",
  },
  {
    icon: ClipboardCheck,
    title: "اختبارات وتقييمات",
    description: "اختبارات إلكترونية مع نتائج فورية.",
  },
  {
    icon: BarChart3,
    title: "تقارير لأولياء الأمور",
    description: "متابعة تقدّم الأبناء أولاً بأول.",
  },
];

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(`/${session.profile.role}/dashboard`);
  }

  return (
    <main dir="rtl" className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--brand-blue) 12%, transparent), transparent), radial-gradient(50% 40% at 90% 10%, color-mix(in oklch, var(--brand-teal) 10%, transparent), transparent)",
          }}
        />
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 py-20 text-center sm:py-28">
          <Logo markClassName="h-16 w-16" className="gap-3" />
          <div className="space-y-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">
              منصّة أكاديمية{" "}
              <span className="text-primary">RSA</span> التعليمية
            </h1>
            <p className="mx-auto max-w-2xl text-balance text-muted-foreground sm:text-lg">
              كل ما يحتاجه الطالب، المعلم، وولي الأمر لمتابعة الرحلة
              التعليمية بسهولة واحترافية.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" render={<Link href="/login">تسجيل الدخول</Link>} />
            <Button
              size="lg"
              variant="outline"
              render={<Link href="/signup">إنشاء حساب جديد</Link>}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border bg-card p-5 text-right shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <h3 className="mb-1 font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
