import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Use default Next.js output for Vercel; rely on file tracing
  experimental: {
    // Keep default; no custom tracing ignores
  },
  
  turbopack: {
    resolveAlias: {
      "property-information/find": "property-information/lib/find.js",
      "property-information/normalize": "property-information/lib/normalize.js",
    },
  },
  
  webpack: (config) => {
    // Keep only minimal alias fix
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "property-information/find": path.resolve(__dirname, "node_modules/property-information/lib/find.js"),
      "property-information/normalize": path.resolve(__dirname, "node_modules/property-information/lib/normalize.js"),
    };
    return config;
  },
  
  // Use defaults; avoid forcing external packages
  
  // Reduce bundle size
  compress: true,
};

export default nextConfig;
