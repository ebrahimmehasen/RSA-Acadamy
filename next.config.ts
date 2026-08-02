import type { NextConfig } from "next";

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
};

export default nextConfig;
