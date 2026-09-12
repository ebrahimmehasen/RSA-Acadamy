"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { SignOutButton } from "@/components/shared/SignOutButton";

export interface NavItem {
  href: string;
  label: string;
  /** Shown but not yet clickable — pairs with a "قريبًا" badge. */
  comingSoon?: boolean;
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
  platform: Settings,
  "zoom-accounts": Video,
};

function iconForHref(href: string): LucideIcon {
  const segment = href.split("/").filter(Boolean).pop() ?? "";
  return ICON_BY_SEGMENT[segment] ?? LayoutDashboard;
}

/** Longest nav href that is a path-segment prefix of the current URL. */
function activeHref(pathname: string, nav: NavItem[]): string | null {
  let best: string | null = null;
  for (const item of nav) {
    if (pathname === item.href || pathname.startsWith(item.href + "/")) {
      if (!best || item.href.length > best.length) best = item.href;
    }
  }
  return best;
}

export function RoleShell({
  title,
  fullName,
  profileId,
  pictureDriveId = null,
  nav,
  density = "comfortable",
  banner,
  children,
}: {
  title: string;
  fullName: string;
  profileId: number;
  pictureDriveId?: string | null;
  nav: NavItem[];
  density?: "comfortable" | "compact";
  /** Persistent alert (e.g. incomplete profile) shown above every page. */
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const current = activeHref(pathname, nav);
  const profileHref =
    nav.find((n) => n.href.endsWith("/profile"))?.href ?? "/settings/profile";
  const initial = fullName.charAt(0);
  // Trailing shared-settings items get their own group below a divider.
  const tailStart = nav.findIndex((n) => n.href.startsWith("/settings"));
  const mainNav = tailStart === -1 ? nav : nav.slice(0, tailStart);
  const tailNav = tailStart === -1 ? [] : nav.slice(tailStart);

  const bottomNav = nav.slice(0, 4);
  const moreNav = nav.slice(4);
  const bottomHasActive = bottomNav.some((n) => n.href === current);

  function renderNavLink(item: NavItem, opts?: { onClick?: () => void }) {
    const Icon = iconForHref(item.href);
    const active = item.href === current;

    if (item.comingSoon) {
      return (
        <div
          key={item.href}
          aria-disabled="true"
          className="flex min-h-11 min-w-0 cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/40 md:min-h-0"
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          <Badge
            variant="secondary"
            className="h-4 shrink-0 px-1.5 text-[10px] font-semibold"
          >
            قريبًا
          </Badge>
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={opts?.onClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:min-h-0",
          active &&
            "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  }

  return (
    <div
      className="flex min-h-screen bg-muted/20"
      dir="rtl"
      data-density={density === "compact" ? "compact" : undefined}
    >
      <aside className="hidden w-64 shrink-0 flex-col border-l bg-sidebar p-4 md:flex">
        <div className="mb-6 flex items-center justify-between px-1">
          <Logo markClassName="h-8 w-8" className="gap-1.5" />
        </div>
        <p className="mb-3 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </p>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {mainNav.map((item) => renderNavLink(item))}
          {tailNav.length > 0 && (
            <>
              <div className="my-2 border-t" />
              {tailNav.map((item) => renderNavLink(item))}
            </>
          )}
        </nav>
        <div className="mt-auto space-y-3 border-t pt-4">
          <div className="flex items-center gap-2 px-1">
            <Link
              href={profileHref}
              aria-label="الملف الشخصي"
              className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Avatar className="size-8">
                {pictureDriveId && (
                  <AvatarImage
                    src={`/api/files/${pictureDriveId}`}
                    alt={fullName}
                  />
                )}
                <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </Link>
            <Link
              href={profileHref}
              className="min-w-0 flex-1 truncate text-sm font-medium outline-none hover:underline focus-visible:underline"
            >
              {fullName}
            </Link>
            <ThemeToggle />
          </div>
          <SignOutButton className="w-full justify-center gap-1.5" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/70 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <span className="md:hidden">
              <Logo markClassName="h-7 w-7" showWordmark={false} />
            </span>
            <p className="truncate text-sm font-semibold text-muted-foreground">
              {title}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <ThemeToggle className="size-11 md:size-9" />
            <NotificationBell
              profileId={profileId}
              className="size-11 md:size-9"
            />
            <Link
              href={profileHref}
              aria-label="الملف الشخصي"
              className="flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
            >
              <Avatar className="size-9">
                {pictureDriveId && (
                  <AvatarImage
                    src={`/api/files/${pictureDriveId}`}
                    alt={fullName}
                  />
                )}
                <AvatarFallback className="bg-primary/10 font-bold text-primary">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>
        {banner}
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>

        <nav
          className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/70 md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {bottomNav.map((item) => {
            const Icon = iconForHref(item.href);
            const active = item.href === current;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-center text-[11px] leading-[1.15] text-muted-foreground",
                  active && "font-semibold text-primary",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="line-clamp-2">{item.label}</span>
              </Link>
            );
          })}
          {moreNav.length > 0 && (
          <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
            <DialogTrigger
              render={
                <button
                  type="button"
                  aria-label="المزيد من الأقسام"
                  className={cn(
                    "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-[11px] leading-[1.15] text-muted-foreground",
                    !bottomHasActive && current && "font-semibold text-primary",
                  )}
                />
              }
            >
              <MoreHorizontal className="size-5 shrink-0" aria-hidden="true" />
              <span>المزيد</span>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
              </DialogHeader>
              <nav className="grid grid-cols-2 gap-2">
                {moreNav.map((item) =>
                  renderNavLink(item, { onClick: () => setMoreOpen(false) }),
                )}
              </nav>
            </DialogContent>
          </Dialog>
          )}
        </nav>
      </div>
    </div>
  );
}
