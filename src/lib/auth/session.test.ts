import { afterEach, describe, expect, it } from "vitest";
import { mintSessionToken, tamperToken } from "../../../tests/helpers/jwt";
import { TEST_AUTH_SECRET } from "../../../tests/helpers/secret";
import { verifySession } from "./session";

describe("verifySession", () => {
  afterEach(() => {
    process.env.AUTH_SECRET = TEST_AUTH_SECRET;
  });

  it("returns null when no token is provided", async () => {
    await expect(verifySession(undefined)).resolves.toBeNull();
  });

  it("returns null for a garbage string", async () => {
    await expect(verifySession("not-a-jwt-at-all")).resolves.toBeNull();
  });

  it("returns null for an expired token", async () => {
    const token = await mintSessionToken({ expiresInSeconds: -60 });
    await expect(verifySession(token)).resolves.toBeNull();
  });

  it("returns null for a token signed with the wrong secret", async () => {
    const token = await mintSessionToken({ secret: "some-other-secret" });
    await expect(verifySession(token)).resolves.toBeNull();
  });

  it("returns null for a token whose role claim was altered after signing", async () => {
    const token = await mintSessionToken({ role: "employee" });
    const spoofed = tamperToken(token, { role: "manager" });
    await expect(verifySession(spoofed)).resolves.toBeNull();
  });

  it("returns null for a valid signature carrying an unknown role", async () => {
    const token = await mintSessionToken({ role: "superadmin" });
    await expect(verifySession(token)).resolves.toBeNull();
  });

  it("returns the payload for a valid employee token", async () => {
    const token = await mintSessionToken({ sub: "user-7", role: "employee" });
    await expect(verifySession(token)).resolves.toEqual({
      sub: "user-7",
      role: "employee",
    });
  });

  it("returns the payload for a valid manager token", async () => {
    const token = await mintSessionToken({ sub: "user-9", role: "manager" });
    await expect(verifySession(token)).resolves.toEqual({
      sub: "user-9",
      role: "manager",
    });
  });

  it("throws a descriptive error when AUTH_SECRET is not configured", async () => {
    const token = await mintSessionToken();
    delete process.env.AUTH_SECRET;
    await expect(verifySession(token)).rejects.toThrow(/AUTH_SECRET/);
  });
});
