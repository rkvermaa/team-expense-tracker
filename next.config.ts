import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // src/db/* uses ESM-style ".js" specifiers that resolve to ".ts" sources
  // (required by tsx/Node's ESM loader for the CLI scripts); tell webpack to
  // resolve those same specifiers to their .ts files when bundled for pages.
  experimental: {
    extensionAlias: {
      ".js": [".ts", ".tsx", ".js"],
    },
  },
};

export default nextConfig;
