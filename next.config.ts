import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // Required for Vercel static export
  },
  
  turbopack: {
    resolveAlias: {
      "property-information/find": "property-information/lib/find.js",
      "property-information/normalize": "property-information/lib/normalize.js",
    },
  },
  
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "property-information/find": path.resolve(__dirname, "node_modules/property-information/lib/find.js"),
      "property-information/normalize": path.resolve(__dirname, "node_modules/property-information/lib/normalize.js"),
    };

    // Optimize for Vercel deployment
    if (isServer) {
      // Mark large dependencies as external to reduce bundle size
      config.externals = config.externals || [];
      config.externals.push({
        'tsx': 'commonjs tsx',
        '@langchain/core': 'commonjs @langchain/core',
        '@langchain/langgraph': 'commonjs @langchain/langgraph',
        '@langchain/openai': 'commonjs @langchain/openai',
        '@modelcontextprotocol/sdk': 'commonjs @modelcontextprotocol/sdk',
      });

      // Disable webpack cache in production to reduce bundle size
      if (process.env.NODE_ENV === 'production') {
        config.cache = false;
      }

      // Simplified bundle splitting for Vercel
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
        },
      };
    }

    return config;
  },
  
  // Optimize for Vercel deployment
  serverExternalPackages: [
    'tsx',
    '@langchain/core',
    '@langchain/langgraph', 
    '@langchain/openai',
    '@modelcontextprotocol/sdk',
    '@octokit/rest',
    'fs',
    'path'
  ],
  
  // Reduce bundle size
  compress: true,
};

export default nextConfig;
