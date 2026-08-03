import { cn } from "@/lib/utils";

/**
 * Brand mark reproducing the RSA logo (graduation cap + R/S/A monogram)
 * using the official palette: blue #3B7DD8, teal #0E8C6B, terracotta #C1512E,
 * gold #D9A521. Kept as inline SVG so it scales crisply at any size and can
 * be recolored per-theme without shipping raster assets.
 */
function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <text
        x="1"
        y="50"
        fontFamily="var(--font-cairo), system-ui, sans-serif"
        fontWeight="800"
        fontSize="40"
        letterSpacing="-2"
      >
        <tspan fill="#3B7DD8">R</tspan>
        <tspan fill="#0E8C6B">S</tspan>
        <tspan fill="#C1512E">A</tspan>
      </text>
      <g transform="translate(2 4) rotate(-8 16 14)">
        <path d="M2 14 L18 6 L34 14 L18 22 Z" fill="#0E8C6B" />
        <path
          d="M9 17.5 V25 c0 3 4.5 5 9 5 s9 -2 9 -5 v-7.5 L18 22 Z"
          fill="#0B6E54"
        />
        <path d="M31 15 L34 14 L34 24" stroke="#0E8C6B" strokeWidth="1.6" fill="none" />
        <circle cx="34" cy="25.5" r="2" fill="#D9A521" />
      </g>
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  showWordmark = true,
  wordmark = "RSA Academy",
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
