// Single source of truth for the AUTH_SECRET used by the test suites.
// vitest.config.ts and playwright.config.ts both inject this value into the
// environment so tokens minted by tests/helpers/jwt.ts verify successfully.
export const TEST_AUTH_SECRET = "test-auth-secret-do-not-use-in-production";
