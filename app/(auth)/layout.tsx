import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 p-4"
    >
      <Link href="/" className="inline-flex">
        <Logo markClassName="h-10 w-10" />
      </Link>
      {children}
    </main>
  );
}
