import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, PORT, TEST_AUTH_SECRET } from "./tests/helpers/env";

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

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    env: {
      AUTH_SECRET: TEST_AUTH_SECRET,
    },
  },
});
