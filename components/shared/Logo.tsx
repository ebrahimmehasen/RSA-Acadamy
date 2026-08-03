import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Official brand mark (graduation cap + R/S/A monogram in a rounded card),
 * exported from the platform's real logo artwork so it matches print/social
 * assets exactly instead of an approximated recreation.
 */
function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/mark.png"
      alt="رياض الصالحين"
      width={256}
      height={256}
      priority
      className={cn("shrink-0 object-contain", className)}
    />
  );
}

export function Logo({
  className,
  markClassName,
  showWordmark = true,
  wordmark = "رياض الصالحين",
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
  wordmark?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={cn("h-9 w-9", markClassName)} />
      {showWordmark && (
        <span className="text-lg font-extrabold tracking-tight text-foreground">
          {wordmark}
        </span>
      )}
    </span>
  );
}

export { LogoMark };
