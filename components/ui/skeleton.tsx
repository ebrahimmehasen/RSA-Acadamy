import { cn } from "@/lib/utils";

/**
 * Low-level shimmer block. Compose these into page-shaped skeletons
 * (see components/skeletons/*). Pulse is disabled under
 * prefers-reduced-motion.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-md bg-muted/70 motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
