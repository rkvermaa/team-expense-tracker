import path from "node:path";
import { defineConfig } from "vitest/config";
import { TEST_AUTH_SECRET } from "./tests/helpers/secret";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    env: {
      AUTH_SECRET: TEST_AUTH_SECRET,
    },
  },
});
