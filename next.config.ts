import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Enable standalone output for Vercel
  output: 'standalone',
  
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

      // More aggressive bundle splitting for Vercel
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = {
        chunks: 'all',
        maxSize: 100000, // 100KB per chunk to stay under 300MB total
        cacheGroups: {
          mcp: {
            test: /[\\/]node_modules[\\/]@modelcontextprotocol[\\/]/,
            name: 'mcp',
            chunks: 'all',
            priority: 20,
            maxSize: 50000, // 50KB max for MCP
          },
          langchain: {
            test: /[\\/]node_modules[\\/]@langchain[\\/]/,
            name: 'langchain',
            chunks: 'all',
            priority: 15,
            maxSize: 100000, // 100KB max for LangChain
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            maxSize: 100000, // 100KB max for other vendors
          },
        },
      };
    }

    // Exclude Next.js cache from serverless bundles
    config.externalsPresets = config.externalsPresets || {};
    config.module = config.module || { rules: [] } as any;
    // No direct rule needed; rely on vercel.json excludeFiles
    return config;
  },
  
  // Optimize for Vercel deployment
  serverExternalPackages: [
    'tsx',
    '@langchain/core',
    '@langchain/langgraph', 
    '@langchain/openai',
    '@modelcontextprotocol/sdk'
  ],
  
  // Reduce bundle size
  compress: true,
};

export default nextConfig;
