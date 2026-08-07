"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
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

/** Full-page animated aurora backdrop the glass panels float over. */
function AuroraBackground() {
  const blobs = [
    { color: "brand-gold", top: "-8%", right: "-8%", size: "22rem", dur: 9, delay: 0 },
    { color: "brand-teal", top: "18%", left: "-10%", size: "20rem", dur: 11, delay: 1 },
    { color: "brand-blue", top: "48%", right: "5%", size: "24rem", dur: 12, delay: 0.5 },
    { color: "brand-terracotta", top: "72%", left: "0%", size: "18rem", dur: 10, delay: 1.5 },
    { color: "brand-blue", top: "95%", right: "20%", size: "20rem", dur: 13, delay: 2 },
  ];
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-background">
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            top: b.top,
            left: b.left,
            right: b.right,
            width: b.size,
            height: b.size,
            backgroundColor: `color-mix(in oklch, var(--${b.color}) 22%, transparent)`,
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: b.dur, repeat: Infinity, ease: "easeInOut", delay: b.delay }}
        />
      ))}
      <div className="absolute inset-0 bg-background/40" />
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
            <motion.span whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
              <Button size="lg" render={<Link href="/login">تسجيل الدخول</Link>} />
            </motion.span>
            <motion.span whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
              <Button
                size="lg"
                variant="outline"
                className={cn(GLASS, GLASS_HOVER, "bg-white/40 dark:bg-white/[0.04]")}
                render={<Link href="/signup">إنشاء حساب جديد</Link>}
              />
            </motion.span>
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
              <motion.span whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
                <Button size="lg" render={<Link href="/signup">إنشاء حساب جديد</Link>} />
              </motion.span>
              <motion.span whileHover={{ y: -2 }} whileTap={{ y: 0 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className={cn(GLASS, GLASS_HOVER, "bg-white/40 dark:bg-white/[0.04]")}
                  render={<Link href="/login">تسجيل الدخول</Link>}
                />
              </motion.span>
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
