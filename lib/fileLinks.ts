/** Client-safe helpers for file links (no server imports). */

/** Same link, but the browser downloads it instead of showing it inline (Cloudflare Worker links only). */
export function withDownload(url: string): string {
  return url.includes("?") ? `${url}&dl=1` : url;
}
