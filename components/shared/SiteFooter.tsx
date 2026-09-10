/**
 * Global credit line shown at the bottom of every page. The extra
 * bottom padding on mobile keeps it clear of the portal bottom nav
 * (fixed, `md:hidden`) on the pages that have one.
 */
export function SiteFooter() {
  return (
    <footer
      dir="ltr"
      className="mt-auto shrink-0 pb-20 pt-3 text-center text-[11px] text-muted-foreground/70 md:pb-3"
    >
      <a
        href="https://404legend.space/"
        target="_blank"
        rel="noopener noreferrer"
        className="outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:underline"
      >
        Devloped by 404legend
      </a>
    </footer>
  );
}
