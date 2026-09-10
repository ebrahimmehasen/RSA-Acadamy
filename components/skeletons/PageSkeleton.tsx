import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Page-shaped loading skeletons.
 *
 * Each block mirrors the structure of a real shared component
 * (PageHeader, StatGrid/StatCard, DataCard, SectionCard, Card…) so the
 * route's `loading.tsx` shows a layout that matches the finished page
 * and there's no layout shift when the data arrives. Used only from
 * `loading.tsx` files — the Next.js App Router shows them instantly on
 * navigation while the async page streams in behind them.
 * ------------------------------------------------------------------ */

/** A card frame identical to <Card> (rounded-xl, ring, card bg, p-4). */
function CardFrame({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl bg-card p-4 ring-1 ring-foreground/10",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Mirrors <PageHeader>. */
export function HeaderSkeleton({
  back,
  description = true,
  action,
}: {
  back?: boolean;
  description?: boolean;
  action?: boolean;
}) {
  return (
    <div className="space-y-1">
      {back && <Skeleton className="mb-2 h-4 w-24" />}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-7 w-48 sm:w-64" />
          {description && <Skeleton className="h-4 w-40 sm:w-72" />}
        </div>
        {action && <Skeleton className="h-9 w-28 shrink-0" />}
      </div>
    </div>
  );
}

/** Mirrors <StatGrid> + <StatCard>. */
export function StatGridSkeleton({ cols = 3 }: { cols?: 2 | 3 | 4 }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-[var(--card-gap)] sm:grid-cols-2",
        cols === 2 && "lg:grid-cols-2",
        cols === 3 && "lg:grid-cols-3",
        cols === 4 && "lg:grid-cols-4",
      )}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <CardFrame key={i} className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="size-9 shrink-0 rounded-full" />
          </div>
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-28" />
        </CardFrame>
      ))}
    </div>
  );
}

/** Mirrors <DataCard> holding a <Table>. */
export function TableCardSkeleton({
  rows = 6,
  cols = 5,
  header = true,
}: {
  rows?: number;
  cols?: number;
  header?: boolean;
}) {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      {header && (
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-10" />
        </div>
      )}
      <div className="space-y-3 p-4">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mirrors <SectionCard> (header + content lines). */
export function SectionCardSkeleton({
  lines = 3,
  title = true,
}: {
  lines?: number;
  title?: boolean;
}) {
  return (
    <CardFrame className="space-y-3">
      {title && (
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-56" />
        </div>
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </CardFrame>
  );
}

/** A form inside a <SectionCard> — label/field pairs + submit. */
export function FormSkeleton({
  fields = 4,
  grid = true,
}: {
  fields?: number;
  grid?: boolean;
}) {
  return (
    <CardFrame className="space-y-4">
      <Skeleton className="h-5 w-44" />
      <div className={cn("gap-4", grid ? "grid sm:grid-cols-2" : "space-y-4")}>
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-9 w-32" />
    </CardFrame>
  );
}

/** Vertical list of content cards (feeds: announcements, sessions, quizzes…). */
export function FeedSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="grid gap-[var(--card-gap)]">
      {Array.from({ length: items }).map((_, i) => (
        <CardFrame key={i} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4" />
        </CardFrame>
      ))}
    </div>
  );
}

/** Responsive grid of small cards (class list, children list…). */
export function CardGridSkeleton({
  items = 6,
  cols = 3,
}: {
  items?: number;
  cols?: 2 | 3;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-[var(--card-gap)] sm:grid-cols-2",
        cols === 3 && "lg:grid-cols-3",
      )}
    >
      {Array.from({ length: items }).map((_, i) => (
        <CardFrame key={i} className="space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3.5 w-1/2" />
        </CardFrame>
      ))}
    </div>
  );
}

/** The weekly timetable matrix (mirrors <ScheduleGrid>): period columns, day rows. */
export function ScheduleSkeleton({
  cols = 6,
  rows = 5,
}: {
  cols?: number;
  rows?: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-11 rounded-xl" />
      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="overflow-x-auto p-3">
          <div className="min-w-[52rem] space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-10 w-20 shrink-0" />
              {Array.from({ length: cols }).map((_, i) => (
                <Skeleton key={i} className="h-10 flex-1" />
              ))}
            </div>
            {Array.from({ length: rows }).map((_, r) => (
              <div key={r} className="flex gap-2">
                <Skeleton className="h-16 w-20 shrink-0" />
                {Array.from({ length: cols }).map((_, c) => (
                  <Skeleton key={c} className="h-16 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type Variant =
  | "dashboard"
  | "list"
  | "feed"
  | "grid"
  | "detail"
  | "detail-stats"
  | "section"
  | "form"
  | "schedule"
  | "grades";

/**
 * One flexible page skeleton — a route's `loading.tsx` just picks the
 * variant that matches its page.
 */
export function PageSkeleton({
  variant,
  narrow = false,
  withForm = false,
  statCols = 3,
  tableCols = 5,
  sections = 2,
}: {
  variant: Variant;
  /** wrap in mx-auto max-w-xl (settings pages) */
  narrow?: boolean;
  /** list / feed pages that show a create-form above the content */
  withForm?: boolean;
  statCols?: 2 | 3 | 4;
  tableCols?: number;
  sections?: number;
}) {
  const content = (() => {
    switch (variant) {
      case "dashboard":
        return (
          <>
            <HeaderSkeleton description={false} />
            <StatGridSkeleton cols={statCols} />
          </>
        );
      case "list":
        return (
          <>
            <HeaderSkeleton action />
            {withForm && <FormSkeleton fields={3} />}
            <TableCardSkeleton cols={tableCols} />
          </>
        );
      case "feed":
        return (
          <>
            <HeaderSkeleton />
            {withForm && <FormSkeleton fields={3} />}
            <FeedSkeleton />
          </>
        );
      case "grid":
        return (
          <>
            <HeaderSkeleton />
            <CardGridSkeleton cols={statCols === 2 ? 2 : 3} />
          </>
        );
      case "detail":
        return (
          <>
            <HeaderSkeleton back />
            <FormSkeleton fields={4} />
            <SectionCardSkeleton lines={2} />
            <SectionCardSkeleton lines={3} />
          </>
        );
      case "detail-stats":
        return (
          <>
            <HeaderSkeleton back />
            <StatGridSkeleton cols={statCols} />
            <TableCardSkeleton rows={4} cols={5} />
            <TableCardSkeleton rows={4} cols={4} />
          </>
        );
      case "section":
        return (
          <>
            <HeaderSkeleton />
            {Array.from({ length: sections }).map((_, i) => (
              <SectionCardSkeleton key={i} lines={i === 0 ? 2 : 3} />
            ))}
          </>
        );
      case "form":
        return (
          <>
            <HeaderSkeleton description={false} />
            <FormSkeleton fields={narrow ? 3 : 4} grid={!narrow} />
            {!narrow && <SectionCardSkeleton lines={3} />}
          </>
        );
      case "schedule":
        return (
          <>
            <HeaderSkeleton />
            <ScheduleSkeleton />
          </>
        );
      case "grades":
        return (
          <>
            <HeaderSkeleton description={false} />
            <StatGridSkeleton cols={statCols} />
            <SectionCardSkeleton lines={3} />
            <SectionCardSkeleton lines={4} />
          </>
        );
    }
  })();

  return (
    <div
      className={cn(
        "flex flex-col gap-[var(--section-gap)]",
        narrow && "mx-auto max-w-xl",
      )}
      role="status"
      aria-label="جارٍ التحميل"
    >
      {content}
    </div>
  );
}
