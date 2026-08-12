# team-expense-tracker

Next.js 15 (App Router) + TypeScript application.

## Development

```sh
npm install
AUTH_SECRET=<any-strong-secret> npm run dev   # serves on port 3004 (ARC_WEB_PORT)
```

`AUTH_SECRET` signs and verifies the `session` JWT cookie. The app fails fast
if it is missing when a session is verified. Test runs inject their own value
(see `tests/helpers/secret.ts`), so no setup is needed for `npm test`.

## Sessions and route guards

Every request passes through `src/middleware.ts`, which reads the `session`
cookie (an HS256 JWT with `sub` and `role` claims, verified server-side) and
applies the route policy in `src/lib/auth/route-policy.ts`:

- Public: `/login`, Next.js internals, static assets
- Authenticated (any role): everything else, including unknown/future routes
- Manager-only: `/manager` and everything beneath it

Unauthenticated or invalid sessions are redirected to `/login`; authenticated
users lacking the required role are redirected to `/dashboard`.

## Testing

```sh
npm run test:unit   # Vitest unit tests
npm run test:e2e    # Playwright E2E (boots the dev server itself)
npm test            # both
```
