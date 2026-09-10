import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-background p-4"
    >
      {/* calm brand-tinted backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--brand-teal)_16%,transparent),transparent_70%),radial-gradient(45%_40%_at_100%_100%,color-mix(in_oklch,var(--brand-blue)_12%,transparent),transparent_70%)]"
      />
      <div className="absolute end-4 top-4">
        <ThemeToggle />
      </div>
      <Link href="/" className="inline-flex">
        <Logo markClassName="h-14 w-14" className="gap-2.5" />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
