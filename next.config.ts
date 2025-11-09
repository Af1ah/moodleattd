import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // For Moodle plugin: use server rendering instead of static export
  // This allows dynamic routes to work properly
  trailingSlash: true,
  images: {
    unoptimized: true
  },
};

export default nextConfig;
