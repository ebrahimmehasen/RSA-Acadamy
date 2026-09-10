import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Convenience wrapper for the very common
 * `Card > CardHeader > CardTitle (+ CardDescription) > CardContent`
 * used for forms and page sections, so header spacing and title size
 * are identical everywhere instead of subtly drifting per page.
 */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={className}>
      {(title != null || description != null || action != null) && (
        <CardHeader className={action ? "flex items-start justify-between gap-2" : undefined}>
          <div className="space-y-1">
            {title != null && <CardTitle>{title}</CardTitle>}
            {description != null && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </CardHeader>
      )}
      <CardContent className={cn(contentClassName)}>{children}</CardContent>
    </Card>
  );
}
