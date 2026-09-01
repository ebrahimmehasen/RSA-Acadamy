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
      className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 p-4"
    >
      <div className="absolute end-4 top-4">
        <ThemeToggle />
      </div>
      <Link href="/" className="inline-flex">
        <Logo markClassName="h-14 w-14" className="gap-2.5" />
      </Link>
      {children}
    </main>
  );
}
