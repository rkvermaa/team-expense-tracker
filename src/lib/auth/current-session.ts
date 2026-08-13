import { cookies } from "next/headers";

import { SESSION_COOKIE, verifySession, type SessionPayload } from "@/lib/auth/session";

/**
 * Server-component wrapper that reads the session cookie (async in Next 15)
 * and verifies it, returning the payload or null. The middleware already
 * guards these routes; pages call this to obtain the verified user id/role
 * rather than trusting anything the client can set.
 */
export async function getCurrentSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}
