import { Skeleton } from "@/components/ui/skeleton";
import { GLASS } from "@/lib/ui";
import { cn } from "@/lib/utils";

/** Mirrors <AuthCard> holding the sign-up form. */
export default function Loading() {
  return (
    <div
      dir="rtl"
      className={cn("w-full rounded-2xl p-6 sm:p-7", GLASS)}
      role="status"
      aria-label="جارٍ التحميل"
    >
      <div className="mb-5 space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-60" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}
