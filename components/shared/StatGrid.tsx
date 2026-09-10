import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Responsive grid for `StatCard`s — 1 col on phones, 2 on small, then
 * `cols` (3 or 4) on desktop. Replaces the assorted
 * `grid gap-4 sm:grid-cols-3` wrappers on the dashboards.
 */
export function StatGrid({
  children,
  cols = 3,
  className,
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-[var(--card-gap)] sm:grid-cols-2",
        cols === 2 && "lg:grid-cols-2",
        cols === 3 && "lg:grid-cols-3",
        cols === 4 && "lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
