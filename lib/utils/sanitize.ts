import DOMPurify from "dompurify";

/**
 * Sanitizes HTML before rendering with dangerouslySetInnerHTML.
 * Currently unused — every rich-text field in the app (announcements,
 * assignment descriptions) is rendered as plain text via React's
 * default escaping (`whitespace-pre-wrap` + text nodes), which is
 * already XSS-safe. Kept ready for the day a WYSIWYG editor is added.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}
