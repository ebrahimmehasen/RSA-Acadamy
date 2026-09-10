"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { GLASS } from "@/lib/ui";

/**
 * The shared shell for every auth screen (login / signup / forgot /
 * reset / verify). Same frosted-glass surface as the landing page,
 * same gentle mount animation, one consistent title/description block.
 */
export function AuthCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      dir="rtl"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn("w-full rounded-2xl p-6 sm:p-7", GLASS, className)}
    >
      <div className="mb-5 space-y-1.5">
        <h1 className="font-heading text-xl font-bold tracking-tight text-balance">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground text-pretty">
            {description}
          </p>
        )}
      </div>
      {children}
    </motion.div>
  );
}
