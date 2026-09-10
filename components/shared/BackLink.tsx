import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-2 inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:underline focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <ArrowRight className="size-4" />
      {label}
    </Link>
  );
}
