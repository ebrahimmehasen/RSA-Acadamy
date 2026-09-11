import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import type { ProfileWarningItem } from "@/lib/profileCompleteness";

/**
 * Persistent (non-dismissible) warning banner shown on every page while
 * required profile fields are missing — mainly accounts an admin
 * bulk-created that skipped the self-signup form's required fields.
 * Reappears on every navigation by design: it's server-rendered from
 * the real DB state each time, not something the user can permanently
 * hide until it's actually fixed.
 */
export function ProfileWarningBanner({ items }: { items: ProfileWarningItem[] }) {
  if (items.length === 0) return null;

  return (
    <div
      role="alert"
      className="border-b bg-warning/15 px-4 py-2.5 text-warning md:px-6"
    >
      <div className="flex flex-wrap items-start gap-2">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <ul className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          {items.map((item) => (
            <li key={item.href + item.message} className="flex flex-wrap items-center gap-x-2">
              <span>{item.message}</span>
              <Link
                href={item.href}
                className="font-semibold underline underline-offset-2 outline-none hover:no-underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {item.linkLabel} ←
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
