import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  
  turbopack: {
    root: __dirname,
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

    // Optimize for Vercel deployment (production only)
    if (isServer && process.env.NODE_ENV === 'production') {
      config.externals = config.externals || [];
      config.externals.push({
        'tsx': 'commonjs tsx',
        '@langchain/core': 'commonjs @langchain/core',
        '@langchain/langgraph': 'commonjs @langchain/langgraph',
        '@langchain/openai': 'commonjs @langchain/openai',
        '@modelcontextprotocol/sdk': 'commonjs @modelcontextprotocol/sdk',
      });

      config.cache = false;
    }

    return config;
  },
  
  serverExternalPackages:
    process.env.NODE_ENV === "production"
      ? [
          "tsx",
          "@langchain/core",
          "@langchain/langgraph",
          "@langchain/openai",
          "@modelcontextprotocol/sdk",
          "@octokit/rest",
        ]
      : undefined,
  
  compress: true,
  
  outputFileTracingIncludes: {
    '/api/**/*': ['./lib/**/*'],
  },
};

export default nextConfig;
