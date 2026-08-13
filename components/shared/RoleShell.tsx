"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  GraduationCap,
  Video,
  FileQuestion,
  User,
  Megaphone,
  Bell,
  Shield,
  Users,
  ClipboardList,
  Settings,
  BarChart3,
  BookMarked,
  ShieldAlert,
  UserCog,
  UsersRound,
  ShieldPlus,
  ClipboardCheck,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { Logo } from "@/components/shared/Logo";

export interface NavItem {
  href: string;
  label: string;
}

const ICON_BY_SEGMENT: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  schedule: Calendar,
  homework: BookOpen,
  grades: GraduationCap,
  sessions: Video,
  quizzes: FileQuestion,
  profile: User,
  announcements: Megaphone,
  notifications: Bell,
  security: Shield,
  "security-logs": ShieldAlert,
  classes: Users,
  assignments: ClipboardList,
  preferences: Settings,
  children: UsersRound,
  reports: BarChart3,
  subjects: BookMarked,
  students: Users,
  teachers: UserCog,
  parents: UsersRound,
  admins: ShieldPlus,
  gradebook: ClipboardCheck,
};

function iconForHref(href: string): LucideIcon {
  const segment = href.split("/").filter(Boolean).pop() ?? "";
  return ICON_BY_SEGMENT[segment] ?? LayoutDashboard;
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
    <div className="flex min-h-screen bg-muted/20" dir="rtl">
      <aside className="hidden w-64 shrink-0 flex-col border-l bg-sidebar p-4 md:flex">
        <div className="mb-6 flex items-center justify-between px-1">
          <Logo markClassName="h-8 w-8" className="gap-1.5" />
        </div>
        <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {nav.map((item) => {
            const Icon = iconForHref(item.href);
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  active &&
                    "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3 border-t pt-4">
          <div className="flex items-center gap-2 px-1">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {fullName.charAt(0)}
            </span>
            <p className="truncate text-sm font-medium">{fullName}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center gap-1.5"
            onClick={signOut}
          >
            <LogOut className="size-4" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/70 md:px-6">
          <div className="md:hidden">
            <Logo markClassName="h-7 w-7" showWordmark={false} />
          </div>
          <div className="hidden flex-1 items-center md:flex">
            <h1 className="text-sm font-semibold text-muted-foreground">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell profileId={profileId} />
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="md:hidden"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">{children}</main>
        <nav
          className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t bg-background/95 py-1 backdrop-blur supports-backdrop-filter:bg-background/70 md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {nav.slice(0, 5).map((item) => {
            const Icon = iconForHref(item.href);
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] text-muted-foreground",
                  active && "font-semibold text-primary",
                )}
              >
                <Icon className="size-5" />
                <span className="max-w-14 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
