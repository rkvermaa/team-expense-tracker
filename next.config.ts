import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The db layer (src/db/*) uses explicit ".js" import specifiers so it runs
  // under tsx/vitest as native ESM. The expense list view is the first server
  // component to pull that layer into Next's webpack bundle, which needs those
  // specifiers mapped back to the ".ts" sources.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
  // better-sqlite3 is a native addon; keep it external so it is required at
  // runtime rather than bundled.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
