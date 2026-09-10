"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Password field with a show/hide toggle — one of the biggest wins for
 * "smooth to use" on a phone keyboard where mistypes are common. The
 * toggle is a real ≥44px button and never submits the form.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        dir="ltr"
        className={cn("pe-11", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
        aria-pressed={visible}
        className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
