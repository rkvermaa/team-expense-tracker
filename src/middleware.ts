import { NextRequest, NextResponse } from "next/server";
import { classifyRoute } from "@/lib/auth/route-policy";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/**
 * Runs on every request before rendering. The role is read from the verified
 * session JWT each time - never from anything the client can alter without
 * invalidating the signature - so direct URL entry, link clicks, and page
 * refreshes all go through the same guard.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const access = classifyRoute(request.nextUrl.pathname);
  if (access === "public") {
    return NextResponse.next();
  }

  const session = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (access === "manager" && session.role !== "manager") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next.js internals and static assets; everything else is guarded.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
