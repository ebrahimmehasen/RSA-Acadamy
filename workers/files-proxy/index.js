/**
 * Cloudflare Worker — serves PRIVATE Google Drive files behind short-lived,
 * HMAC-signed links, so file bytes never pass through Vercel functions
 * (which is what burns the "Fast Origin Transfer" quota).
 *
 *   GET|HEAD /f/<driveFileId>?e=<expiry, unix seconds>&s=<signature>[&dl=1]
 *   signature = base64url( HMAC-SHA256( FILES_SIGNING_SECRET, "<driveFileId>.<e>" ) )
 *
 * The Next.js app mints the link only after it has authorised the viewer;
 * this Worker only checks signature + expiry, then streams from Drive with
 * Range support (PDF / video seeking). No file is ever made public on Drive.
 *
 * Secrets (set in the Worker's settings, never in code):
 *   FILES_SIGNING_SECRET, GOOGLE_OAUTH_CLIENT_ID,
 *   GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN
 */
const MAX_LINK_LIFETIME_S = 7 * 24 * 3600;
const META_TTL_MS = 10 * 60 * 1000;

const encoder = new TextEncoder();
let tokenCache = { value: null, expiresAt: 0 };
const metaCache = new Map();

function toBase64Url(bytes) {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sign(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function text(status, message) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function accessToken(env) {
  if (tokenCache.value && Date.now() < tokenCache.expiresAt - 60_000) return tokenCache.value;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`token refresh failed (${res.status})`);
  const json = await res.json();
  tokenCache = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return tokenCache.value;
}

async function driveMeta(id, token) {
  const hit = metaCache.get(id);
  if (hit && Date.now() - hit.at < META_TTL_MS) return hit.meta;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=name,mimeType,size`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`drive metadata failed (${res.status})`);
  const meta = await res.json();
  metaCache.set(id, { meta, at: Date.now() });
  return meta;
}

function contentDisposition(name, download) {
  const safe = encodeURIComponent(name ?? "file");
  return `${download ? "attachment" : "inline"}; filename*=UTF-8''${safe}`;
}

const worker = {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return text(405, "Method not allowed");
    }
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/f\/([\w-]+)$/);
    if (!match) return text(404, "Not found");
    const id = match[1];

    const exp = Number(url.searchParams.get("e"));
    const sig = url.searchParams.get("s") ?? "";
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isInteger(exp) || exp < now || exp - now > MAX_LINK_LIFETIME_S) {
      return text(403, "Link expired or invalid");
    }
    const expected = await sign(env.FILES_SIGNING_SECRET, `${id}.${exp}`);
    if (!safeEqual(sig, expected)) return text(403, "Link expired or invalid");

    try {
      const token = await accessToken(env);
      const meta = await driveMeta(id, token);
      if (!meta) return text(404, "File not found");

      const upstreamHeaders = { Authorization: `Bearer ${token}` };
      const range = request.headers.get("Range");
      if (range) upstreamHeaders.Range = range;
      const upstream = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`,
        { method: "GET", headers: upstreamHeaders },
      );
      if (upstream.status === 416) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${meta.size ?? "*"}` },
        });
      }
      if (!upstream.ok && upstream.status !== 206) {
        return text(upstream.status === 404 ? 404 : 502, "Upstream error");
      }

      const headers = new Headers({
        "Content-Type": meta.mimeType ?? "application/octet-stream",
        "Content-Disposition": contentDisposition(meta.name, url.searchParams.get("dl") === "1"),
        "Accept-Ranges": "bytes",
        // content of a Drive file id never changes; the link itself is the capability
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      });
      for (const h of ["Content-Length", "Content-Range"]) {
        const v = upstream.headers.get(h);
        if (v) headers.set(h, v);
      }
      return new Response(request.method === "HEAD" ? null : upstream.body, {
        status: upstream.status,
        headers,
      });
    } catch {
      return text(502, "Upstream error");
    }
  },
};

export default worker;
