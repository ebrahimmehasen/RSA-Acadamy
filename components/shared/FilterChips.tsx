import Link from "next/link";
import { cn } from "@/lib/utils";

export interface FilterChip {
  id: string | number;
  label: string;
  href: string;
}

/**
 * Horizontal row of filter/segment chips (class picker, status filter,
 * …). Replaces the copy-pasted `rounded-full border px-3 py-1.5` chip
 * rows in the gradebook, class detail and subjects pages. Scrolls
 * horizontally on overflow instead of wrapping raggedly; each chip is
 * ≥40px tall for touch.
 */
export function FilterChips({
  items,
  activeId,
  className,
  "aria-label": ariaLabel,
}: {
  items: FilterChip[];
  activeId: string | number | undefined;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      className={cn("-mx-1 flex gap-2 overflow-x-auto px-1 pb-1", className)}
      role="group"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
