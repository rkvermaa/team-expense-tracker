// Single source of truth for the environment the test suites run against.
// vitest.config.ts and playwright.config.ts inject TEST_AUTH_SECRET into the
// environment so tokens minted by tests/helpers/jwt.ts verify successfully,
// and the Playwright webServer, baseURL, and cookie origin all derive from
// the same PORT.
export const TEST_AUTH_SECRET = "test-auth-secret-do-not-use-in-production";

export const PORT = Number(process.env.ARC_WEB_PORT ?? 3004);

export const BASE_URL = `http://localhost:${PORT}`;

// Throwaway SQLite database the Next.js app reads during E2E. global-setup
// migrates and seeds it, and playwright.config points the Next dev server's
// DATABASE_PATH at it, so the browser sees the demo employee's real expenses.
export const NEXT_E2E_DB_PATH = "data/e2e-expenses.db";
