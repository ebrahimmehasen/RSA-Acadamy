"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

/**
 * Shared sign-out control — used by the sidebar/header in RoleShell and
 * by the profile pages. Keeps the one supabase.auth.signOut() +
 * redirect flow in a single place.
 */
export function SignOutButton({
  variant = "outline",
  size = "sm",
  className,
  label = "تسجيل الخروج",
  showIcon = true,
  "aria-label": ariaLabel,
}: {
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
  label?: string;
  showIcon?: boolean;
  "aria-label"?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={signOut}
      disabled={isPending}
      aria-label={ariaLabel}
    >
      {showIcon && <LogOut className="size-4" aria-hidden="true" />}
      {label && <span>{isPending ? "جارٍ الخروج…" : label}</span>}
    </Button>
  );
}
