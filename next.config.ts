import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
const supabaseWsOrigin = supabaseOrigin.replace(/^http/, "ws");

const csp = [
  `default-src 'self'`,
  // Next.js needs 'unsafe-inline' for its injected bootstrap scripts;
  // no external script hosts are used.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data:`,
  `connect-src 'self' ${supabaseOrigin} ${supabaseWsOrigin} https://www.googleapis.com`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // recorded-session video uploads are the largest kind (see
      // UPLOAD_RULES.session in lib/googleDrive/upload.ts); server
      // actions buffer the whole body in memory, so this is capped
      // well below the 1GB rule ceiling — large lectures should be
      // trimmed/compressed before upload until this moves to a
      // direct-to-Drive resumable upload flow.
      bodySizeLimit: "100mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
