import type { ReactNode } from "react";
import { BackLink } from "@/components/shared/BackLink";
import { cn } from "@/lib/utils";

/**
 * The single page-title block for every route. Replaces the per-page
 * `<h1 className="text-2xl font-bold">` (+ ad-hoc subtitle + ad-hoc
 * action row) so headings, spacing and the optional back link are
 * identical across all four portals.
 */
export function PageHeader({
  title,
  description,
  action,
  backHref,
  backLabel = "رجوع",
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      {backHref && <BackLink href={backHref} label={backLabel} />}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 space-y-1">
          <h1 className="font-heading text-xl font-bold tracking-tight text-balance sm:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground text-pretty">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
