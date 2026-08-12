export type RouteAccess = "public" | "authenticated" | "manager";

const PUBLIC_EXACT = ["/login", "/favicon.ico"];
const PUBLIC_PREFIXES = ["/_next"];
const MANAGER_PREFIXES = ["/manager"];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Single source of truth for route access levels. Later stories add routes
 * here, not in the middleware. Unknown paths default to "authenticated" so
 * new routes never ship unguarded by accident.
 */
export function classifyRoute(pathname: string): RouteAccess {
  if (
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))
  ) {
    return "public";
  }
  if (MANAGER_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    return "manager";
  }
  return "authenticated";
}
