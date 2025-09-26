import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      'localhost',
      'your-production-domain.vercel.app',
      'your-dev-domain.vercel.app'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // Enable experimental features for better dev experience
  experimental: {
    // Add any experimental features you want to test
  },
};

export default nextConfig;
