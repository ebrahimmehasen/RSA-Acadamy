"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/shared/NotificationBell";

export interface NavItem {
  href: string;
  label: string;
}

export function RoleShell({
  title,
  fullName,
  profileId,
  nav,
  children,
}: {
  title: string;
  fullName: string;
  profileId: number;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen" dir="rtl">
      <aside className="hidden w-60 shrink-0 flex-col border-l bg-muted/30 p-4 md:flex">
        <div className="mb-6">
          <h2 className="text-lg font-bold">RSA Academy</h2>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                pathname.startsWith(item.href) &&
                  "bg-accent font-medium text-accent-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-2 border-t pt-4">
          <p className="truncate text-sm font-medium">{fullName}</p>
          <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
            تسجيل الخروج
          </Button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4">
          <span className="font-bold md:hidden">RSA Academy</span>
          <div className="hidden flex-1 md:block" />
          <div className="flex items-center gap-2">
            <NotificationBell profileId={profileId} />
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="md:hidden"
            >
              خروج
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
        <nav className="sticky bottom-0 flex justify-around border-t bg-background p-1 md:hidden">
          {nav.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-2 py-2 text-xs",
                pathname.startsWith(item.href) && "font-bold text-primary",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
