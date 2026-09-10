import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard page body wrapper — replaces the `<div className="space-y-6">`
 * every page opens with. Vertical rhythm follows the `--section-gap`
 * density token (comfortable everywhere, compact in the admin portal).
 * Extra props (e.g. `dir` on routes rendered outside RoleShell) pass
 * straight through to the div.
 */
export function PageShell({
  children,
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-[var(--section-gap)]", className)}
      {...props}
    >
      {children}
    </div>
  );
}
