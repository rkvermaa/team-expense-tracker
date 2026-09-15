import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, PORT, TEST_AUTH_SECRET } from "./tests/helpers/env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// On hosts without root access, chromium's system libraries (libnss3,
// libnspr4, libasound2) can be provided by extracting the debs into this
// cache directory instead of `playwright install-deps`. No-op elsewhere.
const EXTRA_LIBS = path.join(
  os.homedir(),
  ".cache/playwright-extra-libs/extract/usr/lib/x86_64-linux-gnu",
);
if (fs.existsSync(EXTRA_LIBS)) {
  process.env.LD_LIBRARY_PATH = [EXTRA_LIBS, process.env.LD_LIBRARY_PATH]
    .filter(Boolean)
    .join(":");
}

const E2E_DB_URL = `file:${path.resolve(__dirname, "server/prisma/e2e.db")}`;
const NEXT_DB_PATH = path.resolve(__dirname, "data/e2e-next.db");
const DEV_PORT = 8003;
const WEB_PORT = 3003;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      // STORY-004 route-guard and smoke suites against the root Next.js app
      name: "chromium",
      testIgnore: "auth.spec.ts",
      use: { ...devices["Desktop Chrome"], baseURL: BASE_URL },
    },
    {
      // STORY-003 auth suite against the server/web workspaces
      name: "auth-chromium",
      testMatch: "auth.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://localhost:${WEB_PORT}`,
      },
    },
  ],
  webServer: [
    {
      command: `npx next dev -p ${PORT}`,
      port: PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        AUTH_SECRET: TEST_AUTH_SECRET,
        DATABASE_PATH: NEXT_DB_PATH,
      },
    },
    {
      command: "npm run dev --workspace server",
      port: DEV_PORT,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: E2E_DB_URL,
        JWT_SECRET: "e2e-secret",
        ARC_DEV_PORT: String(DEV_PORT),
      },
    },
    {
      command: "npm run dev --workspace web",
      port: WEB_PORT,
      reuseExistingServer: false,
      env: {
        ARC_WEB_PORT: String(WEB_PORT),
        ARC_DEV_PORT: String(DEV_PORT),
      },
    },
  ],
});
