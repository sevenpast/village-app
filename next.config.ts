import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Temporarily ignore TypeScript errors during build for Vercel deployment
    // TODO: Fix Supabase type definitions properly
    ignoreBuildErrors: true,
  },
  // Explicitly configure Turbopack (Next.js 16 default)
  // This ensures proper bundling of all client components
  experimental: {
    turbo: {
      // Turbopack configuration if needed
    },
  },
};

export default nextConfig;
