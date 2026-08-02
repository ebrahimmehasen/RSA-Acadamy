import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // assignment uploads are ≤25MB (decision #5); leave headroom
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
