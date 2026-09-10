import { Skeleton } from "@/components/ui/skeleton";

/**
 * Root fallback — only seen briefly on a hard page load or a
 * cross-portal jump, while the portal layout (session check) resolves.
 * In-portal navigation uses each route's own `loading.tsx` and keeps
 * the shell mounted. Kept layout-neutral since it can front either the
 * landing page or any portal.
 */
export default function Loading() {
  return (
    <div
      dir="rtl"
      className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6"
      role="status"
      aria-label="جارٍ التحميل"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
