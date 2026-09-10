import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toneIconWrap, type Tone } from "@/lib/ui";

/**
 * One dashboard metric. Replaces the two different stat-card shapes the
 * admin and student dashboards each rolled by hand — same structure
 * everywhere: label, big value, optional icon in a tinted circle,
 * optional hint line, optional link target.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  href,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  tone?: Tone;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full",
              toneIconWrap[tone],
            )}
          >
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="font-heading text-2xl font-bold tabular-nums sm:text-3xl">
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </>
  );

  const cardClass = cn("h-full gap-2 px-4 py-4 transition-colors", className);

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Card className={cn(cardClass, "hover:bg-muted/40")}>{body}</Card>
      </Link>
    );
  }

  return <Card className={cardClass}>{body}</Card>;
}
