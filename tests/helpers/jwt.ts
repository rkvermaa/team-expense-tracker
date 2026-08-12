import { SignJWT } from "jose";
import { TEST_AUTH_SECRET } from "./env";

type MintOptions = {
  sub?: string;
  role?: string;
  secret?: string;
  /**
   * Expiration relative to now, in seconds. Negative values mint an
   * already-expired token; null omits the exp claim entirely.
   */
  expiresInSeconds?: number | null;
};

function toKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/** Mint a signed session JWT. Defaults produce a valid employee token. */
export async function mintSessionToken({
  sub = "user-1",
  role = "employee",
  secret = TEST_AUTH_SECRET,
  expiresInSeconds = 60 * 60,
}: MintOptions = {}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jwt = new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt(now);
  if (expiresInSeconds !== null) {
    jwt.setExpirationTime(now + expiresInSeconds);
  }
  return jwt.sign(toKey(secret));
}

/**
 * Alter a signed token's payload WITHOUT re-signing it, e.g. flipping the role
 * claim to "manager". The signature no longer matches, so verification must
 * reject it - this simulates a client-side spoofing attempt.
 */
export function tamperToken(token: string, patch: Record<string, unknown>): string {
  const [header, payload, signature] = token.split(".");
  if (header === undefined || payload === undefined || signature === undefined) {
    throw new Error("tamperToken: expected a three-part JWT");
  }
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  const altered = { ...decoded, ...patch };
  const reEncoded = Buffer.from(JSON.stringify(altered), "utf8").toString("base64url");
  return [header, reEncoded, signature].join(".");
}
