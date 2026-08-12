import { jwtVerify } from "jose";

/**
 * Session contract shared with the login flow (EXP-STORY-003): an httpOnly
 * cookie named `session` holding an HS256 JWT signed with AUTH_SECRET,
 * carrying `sub` (user id) and `role` claims plus standard iat/exp.
 */
export const SESSION_COOKIE = "session";

export const ROLES = ["employee", "manager"] as const;
export type Role = (typeof ROLES)[number];

export type SessionPayload = {
  sub: string;
  role: Role;
};

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET environment variable must be set to verify session tokens",
    );
  }
  return new TextEncoder().encode(secret);
}

function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/**
 * Verify a session token and return its payload, or null when the token is
 * missing, malformed, expired, signed with the wrong key, or tampered with.
 * The role is taken exclusively from the verified JWT payload.
 */
export async function verifySession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }
  const key = getSecretKey();
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      // Sessions must always carry an expiry; a token without one is invalid
      // no matter who signed it.
      requiredClaims: ["exp"],
    });
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      return null;
    }
    if (!isRole(payload.role)) {
      return null;
    }
    return { sub: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}
