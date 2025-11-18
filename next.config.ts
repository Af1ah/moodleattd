import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // For Moodle plugin: use server rendering instead of static export
  // This allows dynamic routes to work properly
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  
  // Remove console logs in production for security
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' 
      ? {
          exclude: ['error'] // Keep console.error for critical issues
        }
      : false
  }
};

export default nextConfig;
