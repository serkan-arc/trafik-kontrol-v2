import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable React DevTools in production
  reactStrictMode: true,
  
  // Production optimizations
  poweredByHeader: false,
  
  // Disable source maps in production
  productionBrowserSourceMaps: false,
  
  // Compression
  compress: true,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NODE_ENV === 'production' 
      ? 'https://dtektracking.com' 
      : 'http://localhost:3001',
  },
  
  // Experimental features
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;