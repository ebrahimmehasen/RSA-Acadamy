import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * A card built to hold a table (or any wide content): optional header
 * row (title + count + action) and a body that scrolls horizontally on
 * its own, so wide tables never push the whole page sideways.
 * Replaces the inconsistent "table wrapped in a Card / bare table /
 * table in a div.border" patterns across the admin & teacher pages.
 */
export function DataCard({
  title,
  count,
  action,
  children,
  bodyClassName,
  className,
}: {
  title?: ReactNode;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  className?: string;
}) {
  const hasHeader = title != null || action != null;
  return (
    <Card className={cn("gap-0 py-0", className)}>
      {hasHeader && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex items-baseline gap-2">
            {title != null && (
              <span className="font-heading text-sm font-semibold">{title}</span>
            )}
            {count != null && (
              <span className="text-xs text-muted-foreground tabular-nums">
                ({count})
              </span>
            )}
          </div>
          {action && (
            <div className="flex shrink-0 items-center gap-2">{action}</div>
          )}
        </div>
      )}
      <div className={cn("w-full overflow-x-auto", bodyClassName)}>{children}</div>
    </Card>
  );
}
