/**
 * Shared UI class constants and tone helpers, so the many pages that
 * hand-roll the same markup (native <select>s, status pills, page
 * wrappers) stay visually identical without each re-deriving the classes.
 * Presentational only — no data logic.
 */

/**
 * Native <select> styling matching the Input/Button look. Comfortable
 * height on touch (h-9 ≈ 36px, close to the 44px target with padding),
 * tighter on desktop where the admin portal wants density.
 */
export const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-8";

/**
 * Auth screens are used mostly on phones and one field at a time —
 * they get a full 44px touch height (vs the dense in-app SELECT_CLASS).
 */
export const AUTH_INPUT_CLASS = "h-11 text-base";
export const AUTH_SELECT_CLASS =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Frosted-glass surface shared by the landing page and the auth cards,
 * so the signed-out "front door" of the platform reads as one design.
 */
export const GLASS =
  "border border-white/50 bg-white/60 shadow-lg shadow-black/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/20";
export const GLASS_HOVER =
  "hover:border-white/70 hover:bg-white/70 hover:shadow-xl dark:hover:border-white/15 dark:hover:bg-white/[0.09]";

/** Standard page body wrapper — vertical rhythm follows the density token. */
export const PAGE_WRAP = "flex flex-col gap-[var(--section-gap)]";

export type Tone = "default" | "success" | "warning" | "info" | "destructive";

/** Map a semantic status tone to a Badge variant. */
export const toneToBadgeVariant: Record<
  Tone,
  "secondary" | "success" | "warning" | "info" | "destructive"
> = {
  default: "secondary",
  success: "success",
  warning: "warning",
  info: "info",
  destructive: "destructive",
};

/** Tinted circle behind a stat/section icon, keyed by tone. */
export const toneIconWrap: Record<Tone, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  info: "bg-info/12 text-info",
  destructive: "bg-destructive/10 text-destructive",
};
