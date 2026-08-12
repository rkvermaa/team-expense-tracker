import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "../src/lib/password.js";
import { DEMO_PASSWORD_BCRYPT_HASH } from "../src/lib/seed-data.js";

// Cross-story contract with EXP-STORY-003 (auth): login must verify passwords
// through this module, and the committed demo hash must match what
// hashPassword produces for the documented demo password.
describe("password hashing contract", () => {
  it("round-trips hash and verify", () => {
    const hash = hashPassword("some-plain-text");
    expect(hash).not.toBe("some-plain-text");
    expect(verifyPassword("some-plain-text", hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("verifies the documented demo password against the committed seed hash", () => {
    expect(verifyPassword("demo1234", DEMO_PASSWORD_BCRYPT_HASH)).toBe(true);
  });
});
