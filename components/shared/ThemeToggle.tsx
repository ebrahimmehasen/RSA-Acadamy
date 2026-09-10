"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Cycles system -> light -> dark -> system. Defaults to following the OS
 * preference (see ThemeProvider in app/layout.tsx), but most people expect
 * an explicit switch they can override that with, so this exposes one.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // next-themes only knows the resolved theme after mount (it reads
  // localStorage/matchMedia client-side) — render a neutral icon until
  // then to avoid a server/client mismatch.
  const [mounted, setMounted] = useState(false);
  // next-themes' documented mount-detection pattern: runs once,
  // unconditionally, only to gate the first client render against a
  // server/client theme mismatch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  function cycle() {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme(theme === "system" ? "light" : "system");
  }

  const label =
    !mounted || theme === "system"
      ? "تبديل المظهر (تلقائي حسب النظام)"
      : theme === "dark"
        ? "التبديل للوضع الفاتح"
        : "التبديل للوضع الداكن";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={label}
      title={label}
      className={cn("size-9", className)}
    >
      {mounted && theme === "light" ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </Button>
  );
}
