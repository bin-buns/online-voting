import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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