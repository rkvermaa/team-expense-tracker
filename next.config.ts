import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // src/db/* uses explicit ".js" extensions on relative imports so the CLI
  // scripts run under tsx/Node's ESM loader; map that same extension back to
  // ".ts" here so webpack (which has no such mapping by default) can bundle
  // those modules too.
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
