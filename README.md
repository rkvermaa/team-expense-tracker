# team-expense-tracker

Track, submit, and approve team expenses. Next.js 15 (App Router) + TypeScript
application.

## Getting started

Prerequisites: Node.js 20+.

```sh
npm install
npm run db:seed
```

`npm run db:seed` creates the SQLite database (at `data/expense-tracker.db` by
default, override with the `DATABASE_PATH` environment variable), applies all
migrations, and populates it with demo data. It is idempotent - safe to re-run
at any time; it never duplicates records or touches data you created yourself.

## Demo accounts

The seed creates two accounts you can log in with immediately:

| Role     | Email                | Password   |
| -------- | -------------------- | ---------- |
| Employee | `employee@demo.test` | `demo1234` |
| Manager  | `manager@demo.test`  | `demo1234` |

The employee account owns a small set of demo expenses covering every status
(submitted, approved, and rejected), and each decided expense has a status
history entry recorded by the manager account.

## Development

```sh
npm install
AUTH_SECRET=<any-strong-secret> npm run dev   # serves on ARC_WEB_PORT, default 3004
```

`AUTH_SECRET` signs and verifies the `session` JWT cookie. The app fails fast
if it is missing when a session is verified. Test runs inject their own value
(see `tests/helpers/env.ts`), so no setup is needed for `npm test`. The dev
server, the Playwright webServer, and the E2E cookie origin all derive their
port from `ARC_WEB_PORT` (default 3004).

Database workflow:

```sh
npm run db:generate  # regenerate drizzle migrations after schema changes
npm run db:migrate   # apply migrations without seeding
npm run db:seed      # apply migrations and populate demo data
```

## Sessions and route guards

Every request passes through `src/middleware.ts`, which reads the `session`
cookie (an HS256 JWT with `sub` and `role` claims, verified server-side) and
applies the route policy in `src/lib/auth/route-policy.ts`:

- Public: `/login`, Next.js internals, static assets
- Authenticated (any role): everything else, including unknown/future routes
- Manager-only: `/manager` and everything beneath it

Unauthenticated or invalid sessions are redirected to `/login` (API paths
under `/api/` get a 401 JSON response instead); authenticated users lacking
the required role are redirected to `/dashboard`.

Contract note for the login story (EXP-STORY-003): the middleware does not
yet pass the originally requested URL to `/login` (for example via a `?next=`
query param). If post-login "return to where you were" is wanted, the login
flow should define that param and the middleware redirect in
`src/middleware.ts` can start appending it.

## Testing

```sh
npm run test:unit   # Vitest unit tests
npm run test:e2e    # Playwright E2E (boots the dev server itself)
npm test            # both
```
