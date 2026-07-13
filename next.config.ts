import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Character-render uploads post the raw image through a Server Action.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
