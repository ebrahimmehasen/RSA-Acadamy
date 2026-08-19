"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  Video,
  ClipboardCheck,
  BarChart3,
  Calendar,
  BookOpen,
  FileQuestion,
  User,
  Users,
  ClipboardList,
  Settings,
  UsersRound,
  ShieldCheck,
  BellRing,
  Megaphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const HIGHLIGHTS = [
  {
    icon: GraduationCap,
    title: "متابعة أكاديمية شاملة",
    description: "جدول الحصص، الدرجات، والواجبات في مكان واحد.",
    color: "brand-blue",
  },
  {
    icon: Video,
    title: "حصص مسجلة",
    description: "مراجعة الشرح في أي وقت من أي جهاز.",
    color: "brand-teal",
  },
  {
    icon: ClipboardCheck,
    title: "اختبارات وتقييمات",
    description: "اختبارات إلكترونية مع نتائج فورية.",
    color: "brand-terracotta",
  },
  {
    icon: BarChart3,
    title: "تقارير لأولياء الأمور",
    description: "متابعة تقدّم الأبناء أولاً بأول.",
    color: "brand-gold",
  },
];

type RoleService = { icon: LucideIcon; title: string; description: string };

const ROLE_SERVICES: {
  key: string;
  label: string;
  color: string;
  intro: string;
  services: RoleService[];
}[] = [
  {
    key: "student",
    label: "الطالب",
    color: "brand-blue",
    intro: "كل ما يحتاجه الطالب لمتابعة دراسته بنفسه، بواجهة بسيطة ومريحة.",
    services: [
      { icon: Calendar, title: "الجدول الدراسي", description: "مواعيد الحصص القادمة أولاً بأول." },
      { icon: BookOpen, title: "الواجبات", description: "استلام وتسليم الواجبات إلكترونياً." },
      { icon: GraduationCap, title: "الدرجات", description: "متابعة النتائج والتقييمات فور رصدها." },
      { icon: Video, title: "الحصص المسجلة", description: "إعادة مشاهدة أي شرح في أي وقت." },
      { icon: FileQuestion, title: "الاختبارات الإلكترونية", description: "اختبارات تفاعلية بنتائج فورية." },
      { icon: User, title: "الملف الشخصي", description: "بيانات الطالب ومواده الدراسية." },
    ],
  },
  {
    key: "teacher",
    label: "المعلم",
    color: "brand-teal",
    intro: "أدوات تنظّم عمل المعلم اليومي من التحضير للتقييم.",
    services: [
      { icon: Users, title: "إدارة الفصول", description: "متابعة الطلاب المسجلين في كل فصل." },
      { icon: ClipboardList, title: "التكليفات والواجبات", description: "إنشاء الواجبات وتصحيحها بسهولة." },
      { icon: FileQuestion, title: "الاختبارات", description: "تصميم اختبارات إلكترونية ورصد النتائج." },
      { icon: Video, title: "الحصص المسجلة", description: "رفع تسجيلات الحصص لمراجعة الطلاب." },
      { icon: Settings, title: "التفضيلات", description: "إعدادات الحساب والتنبيهات الخاصة." },
    ],
  },
  {
    key: "parent",
    label: "ولي الأمر",
    color: "brand-terracotta",
    intro: "اطمئن على تقدّم أبنائك ومتابعة كل شيء من مكان واحد.",
    services: [
      { icon: UsersRound, title: "متابعة الأبناء", description: "عرض جدول وأداء كل ابن مسجّل." },
      { icon: BarChart3, title: "التقارير الدورية", description: "تقارير أداء واضحة عن التقدّم الدراسي." },
      { icon: BellRing, title: "الإشعارات", description: "تنبيهات فورية بأي جديد يخص أبنائك." },
      { icon: Megaphone, title: "الإعلانات", description: "إعلانات الأكاديمية وأخبارها المهمة." },
      { icon: GraduationCap, title: "الدرجات والواجبات", description: "متابعة تفصيلية لكل مادة دراسية." },
    ],
  },
];

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: "أمان بيانات موثوق",
    description: "تحقق ثنائي وسجل أمان كامل لحماية حسابك وبيانات أبنائك.",
    color: "brand-blue",
  },
  {
    icon: Video,
    title: "محتوى متاح دائماً",
    description: "الحصص المسجلة تبقى متاحة للمراجعة في أي وقت يناسبك.",
    color: "brand-teal",
  },
  {
    icon: BarChart3,
    title: "متابعة لحظية",
    description: "تقارير وإشعارات فورية بدل انتظار نهاية الفصل الدراسي.",
    color: "brand-terracotta",
  },
];

/** Shared frosted-glass surface used for every card/panel on the landing page. */
const GLASS =
  "border border-white/50 bg-white/50 shadow-lg shadow-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/20";
const GLASS_HOVER =
  "hover:border-white/70 hover:bg-white/65 hover:shadow-xl dark:hover:border-white/15 dark:hover:bg-white/[0.09]";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={fadeUp}
      transition={{ duration: 0.55, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Login is temporarily disabled on the landing page (not the /login
 * route itself) — rendered as a blurred, inert button with a
 * pulsing "Soon" badge instead of a working Link, per an explicit
 * decision to soft-block it here for now.
 */
function ComingSoonButton({
  label,
  variant,
}: {
  label: string;
  variant?: "outline";
}) {
  return (
    <span className="relative inline-flex">
      <Button
        size="lg"
        variant={variant}
        disabled
        aria-disabled="true"
        className={cn(
          variant === "outline" && cn(GLASS, "bg-white/40 dark:bg-white/[0.04]"),
          "pointer-events-none blur-[3px] select-none opacity-60",
        )}
      >
        {label}
      </Button>
      {/* Plain CSS animate-pulse instead of a framer-motion loop — the
          browser's own compositor handles it with no per-frame JS, so
          it stays smooth on low-end phones. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-2.5 -right-3 z-10 animate-pulse rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-widest text-white shadow-lg ring-2 ring-background"
        style={{ backgroundColor: "var(--brand-gold)", rotate: "6deg" }}
      >
        SOON
      </span>
    </span>
  );
}

function ColorIcon({
  icon: Icon,
  color,
  size = "size-10",
}: {
  icon: LucideIcon;
  color: string;
  size?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl backdrop-blur-sm ${size}`}
      style={{
        backgroundColor: `color-mix(in oklch, var(--${color}) 20%, transparent)`,
        color: `var(--${color})`,
      }}
    >
      <Icon className="size-5" />
    </span>
  );
}

/**
 * Full-page animated aurora backdrop the glass panels float over.
 * Kept deliberately light: fewer blobs, a smaller blur radius, and
 * opacity-only motion (no scale) — animated blur filters are one of
 * the most expensive things a low-end phone's compositor can do, and
 * five large continuously-scaling ones were enough to visibly stutter
 * scroll on weaker devices. Also fully static for prefers-reduced-motion.
 */
function AuroraBackground() {
  const reduceMotion = useReducedMotion();

  // Sizes use clamp(min, vw-scaled, max) instead of a fixed rem value so the
  // blobs stay proportional to the viewport: on a ~375px phone they were
  // nearly full-bleed and read as bold moving color, but at fixed rem sizes
  // the same blob was a small, mostly off-screen sliver on a 1440px+
  // desktop — reads as "missing" even though it's rendering correctly.
  const blobs = [
    { color: "brand-gold", top: "-8%", right: "-8%", size: "clamp(20rem, 28vw, 38rem)", dur: 14, delay: 0 },
    { color: "brand-teal", top: "22%", left: "-10%", size: "clamp(18rem, 25vw, 34rem)", dur: 17, delay: 1.5 },
    { color: "brand-blue", top: "60%", right: "5%", size: "clamp(20rem, 28vw, 40rem)", dur: 16, delay: 0.8 },
  ];
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-background">
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-2xl"
          style={{
            top: b.top,
            left: b.left,
            right: b.right,
            width: b.size,
            height: b.size,
            backgroundColor: `color-mix(in oklch, var(--${b.color}) 26%, transparent)`,
          }}
          animate={reduceMotion ? undefined : { opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: b.dur, repeat: Infinity, ease: "easeInOut", delay: b.delay }}
        />
      ))}
      <div className="absolute inset-0 bg-background/30" />
    </div>
  );
}

export function LandingPage() {
  return (
    <main dir="rtl" className="relative min-h-screen overflow-x-clip">
      <AuroraBackground />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <motion.div
          className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 py-20 text-center sm:py-28"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div
            className={cn("rounded-3xl px-12 py-14", GLASS)}
            variants={{
              hidden: { opacity: 0, scale: 0.9, y: 10 },
              visible: { opacity: 1, scale: 1, y: 0 },
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div
              className="relative h-20 sm:h-24"
              style={{ aspectRatio: "5266 / 1931" }}
            >
              <Image
                src="/brand/logo-wide.png"
                alt="رياض الصالحين"
                fill
                priority
                sizes="(min-width: 640px) 20rem, 16rem"
                className="object-contain"
              />
              <div
                aria-hidden
                className="absolute animate-cap-float"
                style={{
                  left: "-12.5%",
                  top: "-39.15%",
                  width: "35.78%",
                  height: "60.54%",
                }}
              >
                <Image
                  src="/brand/cap.png"
                  alt=""
                  fill
                  priority
                  sizes="8rem"
                  className="object-contain drop-shadow-md"
                />
              </div>
            </div>
          </motion.div>
          <motion.div className="space-y-4" variants={fadeUp} transition={{ duration: 0.55, ease: "easeOut" }}>
            <h1 className="text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">
              منصّة{" "}
              <span className="text-primary">رياض الصالحين</span> التعليمية
            </h1>
            <p className="mx-auto max-w-2xl text-balance text-muted-foreground sm:text-lg">
              كل ما يحتاجه الطالب، المعلم، وولي الأمر لمتابعة الرحلة
              التعليمية بسهولة ومتعة واحترافية — في مكان واحد.
            </p>
          </motion.div>
          <motion.div
            className="flex flex-wrap items-center justify-center gap-3"
            variants={fadeUp}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <ComingSoonButton label="تسجيل الدخول" />
            <ComingSoonButton label="إنشاء حساب جديد" variant="outline" />
            <motion.span whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
              <Button
                size="lg"
                variant="ghost"
                render={<Link href="#services">استكشف الخدمات</Link>}
              />
            </motion.span>
          </motion.div>
        </motion.div>
      </div>

      {/* Quick highlights */}
      <div className="mx-auto max-w-5xl px-6 pb-16">
        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
        >
          {HIGHLIGHTS.map(({ icon: Icon, title, description, color }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              whileHover={{ y: -6 }}
              className={cn("rounded-2xl p-5 text-right transition-all", GLASS, GLASS_HOVER)}
            >
              <span className="mb-3 block w-fit">
                <ColorIcon icon={Icon} color={color} />
              </span>
              <h3 className="mb-1 font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Services by role */}
      <section id="services" className="border-y border-white/30 dark:border-white/5">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <Badge
              variant="secondary"
              className={cn("mb-3 h-6 border-none px-3 text-[13px]", GLASS)}
            >
              <Sparkles className="size-3.5" />
              خدمات المنصة
            </Badge>
            <h2 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
              منصّة واحدة، تجربة مخصّصة لكل فرد في الرحلة التعليمية
            </h2>
            <p className="mt-3 text-balance text-muted-foreground">
              اختر دورك لتكتشف الأدوات المصمّمة خصيصاً له.
            </p>
          </Reveal>

          <Reveal className="flex flex-col items-center" delay={0.1}>
            <Tabs defaultValue="student" className="w-full items-center">
              <TabsList className={cn("h-auto flex-wrap gap-1 p-1.5", GLASS)}>
                {ROLE_SERVICES.map((role) => (
                  <TabsTrigger
                    key={role.key}
                    value={role.key}
                    className="h-9 px-4 text-sm font-semibold data-active:bg-white/70 data-active:backdrop-blur-sm dark:data-active:bg-white/10"
                  >
                    {role.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {ROLE_SERVICES.map((role) => (
                <TabsContent
                  key={role.key}
                  value={role.key}
                  className="mt-8 w-full"
                >
                  <p className="mx-auto mb-6 max-w-xl text-center text-sm text-muted-foreground">
                    {role.intro}
                  </p>
                  <motion.div
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                  >
                    {role.services.map(({ icon: Icon, title, description }) => (
                      <motion.div
                        key={title}
                        variants={fadeUp}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        whileHover={{ y: -4 }}
                        className={cn(
                          "flex items-start gap-3 rounded-2xl p-4 text-right transition-all",
                          GLASS,
                          GLASS_HOVER
                        )}
                      >
                        <ColorIcon icon={Icon} color={role.color} />
                        <div>
                          <h3 className="mb-0.5 font-semibold">{title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {description}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </TabsContent>
              ))}
            </Tabs>
          </Reveal>
        </div>
      </section>

      {/* Trust / differentiators */}
      <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
            لماذا تختار رياض الصالحين
          </h2>
          <p className="mt-3 text-balance text-muted-foreground">
            بناها فريقنا لتكون بيئة تعليمية آمنة، شفافة، ومريحة لكل الأطراف.
          </p>
        </Reveal>
        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
        >
          {TRUST_POINTS.map(({ icon: Icon, title, description, color }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              whileHover={{ y: -4 }}
              className={cn(
                "flex items-start gap-4 rounded-2xl p-5 text-right transition-all",
                GLASS,
                GLASS_HOVER
              )}
            >
              <ColorIcon icon={Icon} color={color} size="size-11" />
              <div>
                <h3 className="mb-1 font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden border-t border-white/30 dark:border-white/5">
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 py-16 text-center sm:py-20">
          <div className={cn("flex flex-col items-center gap-5 rounded-3xl px-8 py-10", GLASS)}>
            <h2 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
              ابدأ رحلتك مع رياض الصالحين اليوم
            </h2>
            <p className="text-balance text-muted-foreground">
              سواء كنت طالباً، معلماً، أو ولي أمر — حسابك جاهز خلال دقائق.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <ComingSoonButton label="إنشاء حساب جديد" />
              <ComingSoonButton label="تسجيل الدخول" variant="outline" />
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/30 dark:border-white/5">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 py-8 text-center">
          <Image
            src="/brand/mark.png"
            alt="رياض الصالحين"
            width={256}
            height={256}
            className="h-10 w-10 object-contain"
          />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} رياض الصالحين. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>
    </main>
  );
}
