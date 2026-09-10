import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard page body wrapper — replaces the `<div className="space-y-6">`
 * every page opens with. Vertical rhythm follows the `--section-gap`
 * density token (comfortable everywhere, compact in the admin portal).
 */
export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-[var(--section-gap)]", className)}>
      {children}
    </div>
  );
}
