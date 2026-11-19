import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Next.js tracing inside this app; a separate lockfile exists one level up.
  outputFileTracingRoot: process.cwd(),
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "aevhvlwucdtbnkbhxcpl.supabase.co",
      },
    ],
  },
};

export default nextConfig;
