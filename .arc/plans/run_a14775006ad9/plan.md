summary: |
  Add a read-only "notification history" feature to the root Next.js app
  (the active codebase: drizzle + SQLite + the `src/middleware.ts` route-guard
  stack; `server/` and `web/` are the superseded EXP-STORY-003 prototype and
  are not touched). Nothing in the repository currently models or sends
  notifications, so this story must introduce the minimal persistence (a
  `notifications` table), a small data-access function, and a new
  `/notifications` page that lists a signed-in user's own notifications
  (type, date sent, channel(s)) most-recent-first, with an empty-state
  message, no delete/archive affordance, and verified screen-reader/contrast
  accessibility. `/notifications` is guarded for free by the existing
  route-policy default ("unknown paths require authentication"), so no
  middleware change is needed. Every unit of work is test-first: a table
  test, a query test, and e2e tests (including axe-core accessibility scans)
  are written before the corresponding code.

scope:
  - description: |
      Add a `notifications` table to the drizzle schema: `id`, `user_id`
      (FK -> `users.id`), `type` (`due` | `confirmation` | `overdue`, CHECK
      constrained), `channels` (comma-separated text, e.g. `"email,in_app"`,
      CHECK non-empty), `sent_at` (defaults to `CURRENT_TIMESTAMP`, same
      convention as `expenses.created_at` / `status_history.changed_at`).
      Generate the migration with `npm run db:generate` (adds a new file
      under `drizzle/` plus an updated `drizzle/meta/_journal.json` snapshot
      - not hand-authored).
    files:
      - src/db/schema.ts
      - drizzle/000X_<generated_name>.sql (generated)
      - drizzle/meta/_journal.json (generated)
      - drizzle/meta/000X_snapshot.json (generated)
    rationale: |
      No notification concept exists anywhere in the codebase yet (grepped
      for "notification", zero hits); this story is the first to need
      storage for it. Mirrors the existing `status_history` table's shape
      (FK to `users`, a constrained enum column, a timestamp default) so it
      fits the schema's established conventions.
  - description: |
      Add a small query module exposing
      `getNotificationsForUser(db: Db, userId: number): NotificationRecord[]`
      that selects by `user_id`, orders by `sent_at` descending, and expands
      `channels` into a `string[]`. This is the single place that encodes
      "most recent first" and "only this user's rows" so both the page and
      its unit tests exercise the same logic.
    files:
      - src/db/queries/notifications.ts
    rationale: |
      Keeps AC1 (ordering) and AC7 (isolation) fast-testable at the data
      layer with `freshDb()`, without needing a browser for every case -
      matching how `tests/db/expenses-table.test.ts` tests constraints
      directly against a migrated in-memory db.
  - description: |
      Add a runtime DB singleton for Next.js server components to use
      (nothing in `src/app/*` currently opens a real DB connection - the
      existing pages are static placeholders).
      ```ts
      // src/db/runtime.ts
      import { createDb } from "./client.js";

      export const db = createDb(process.env.DATABASE_PATH ?? "data/expense-tracker.db");
      ```
    files:
      - src/db/runtime.ts
    rationale: |
      Matches the `DATABASE_PATH` convention already used by
      `src/db/migrate-cli.ts` / `src/db/seed-cli.ts`, and avoids opening a
      new SQLite connection per request by keeping one module-scoped client.
  - description: |
      Add the `/notifications` page as an async server component: verify the
      session from the `session` cookie (reusing `SESSION_COOKIE` /
      `verifySession` from `src/lib/auth/session.ts`, exactly as the
      middleware does), fetch `getNotificationsForUser(db, Number(session.sub))`,
      and render either the empty-state message or a `<ul>` where each `<li>`
      carries an explicit `aria-label` mirroring its visible text (type, date,
      channel(s)) so the accessible name is guaranteed regardless of
      browser/AT-specific `listitem` content-naming behaviour. No
      delete/archive control is rendered anywhere on the page.
      ```tsx
      const TYPE_LABEL: Record<NotificationType, string> = {
        due: "Due", confirmation: "Confirmation", overdue: "Overdue",
      };
      const CHANNEL_LABEL: Record<string, string> = {
        email: "Email", in_app: "In-app",
      };
      ```
    files:
      - src/app/notifications/page.tsx
    rationale: |
      No API route is introduced: nothing else in the app needs this data
      as JSON, and the dashboard/login pages already establish the pattern
      of a server component doing its own thing without a REST layer.
      `/notifications` needs no middleware/route-policy change because
      `classifyRoute` already defaults unmatched paths to `"authenticated"`
      (see `src/lib/auth/route-policy.test.ts`'s
      "defaults unknown paths to authenticated" case), which covers AC7's
      "authenticated tenant only" requirement for reaching the route at all;
      the page itself still must filter by `session.sub` to satisfy AC7's
      per-tenant row isolation.
  - description: |
      Link to the new page from the dashboard placeholder, next to the
      existing "Manager area" link, so the feature is reachable through the
      UI rather than only by direct URL.
    files:
      - src/app/dashboard/page.tsx
    rationale: |
      Mirrors the existing single nav link already on that page; keeps the
      feature discoverable without adding a new nav/layout abstraction.
  - description: |
      Extend the demo seed data with a fixed set of notifications (mirrors
      `SEED_EXPENSES`'s shape/idempotency pattern): a few for the demo
      employee spanning all three types and channels, and one for the demo
      manager, so `npm run db:seed` produces browsable, cross-tenant demo
      data.
    files:
      - src/lib/seed-data.ts
      - src/db/seed.ts
      - tests/seed.test.ts
    rationale: |
      Matches how expenses/status-history demo data is defined and tested;
      also gives the e2e suite (below) real, deterministic rows to assert
      against instead of hand-inserting rows out of band.
  - description: |
      Update the closed-world table-list assertion to include the new table.
      ```ts
      expect(tables.map((t) => t.name)).toEqual([
        "__drizzle_migrations",
        "expenses",
        "notifications",
        "status_history",
        "users",
      ]);
      ```
    files:
      - tests/db/schema-shape.test.ts
    rationale: |
      This test currently hard-codes the exact table set; adding a table
      without updating it would break an existing, unrelated-looking test
      for a correct reason.
  - description: |
      Make the root app's Playwright run hermetic for DB-backed pages: seed
      a dedicated SQLite file for the Next.js dev server the same way
      `e2e/global-setup.ts` already force-resets `server/prisma/e2e.db` for
      the legacy stack, and point the Next dev `webServer` entry at it via
      `DATABASE_PATH`. Today no e2e test against the root app touches real
      DB rows (route-guards/smoke tests only exercise JWT claims), so this
      is new but necessary infrastructure for AC1/AC2/AC3/AC7's e2e
      coverage to be deterministic rather than depending on whatever is in
      a developer's local `data/expense-tracker.db`.
      ```ts
      // e2e/global-setup.ts (addition)
      const NEXT_DB_PATH = path.resolve(__dirname, "../data/e2e-next.db");
      // ...
      fs.rmSync(NEXT_DB_PATH, { force: true });
      const db = createDb(NEXT_DB_PATH);
      runMigrations(db);
      seed(db);
      db.$client.close();
      ```
    files:
      - e2e/global-setup.ts
      - playwright.config.ts
    rationale: |
      Without a seeded, known-content DB, e2e assertions about ordering,
      per-user isolation, and empty-state would be flaky or would require
      inventing out-of-band setup per test. This follows the existing
      force-reset-then-seed pattern already used for the legacy Prisma db
      in the same file.
  - description: |
      Add the notifications e2e suite: login via `mintSessionToken` +
      cookie injection (same helper `route-guards.spec.ts` already uses),
      pointed at the numeric seeded user ids, covering AC1-AC3, AC6, AC7,
      plus two axe-core scans for AC4 and AC5.
    files:
      - e2e/notifications.spec.ts
    rationale: |
      Mirrors the existing `e2e/route-guards.spec.ts` structure (session
      cookie injection, `getByRole` assertions) for the browser-observable
      ACs, and uses `@axe-core/playwright` for the two accessibility ACs
      instead of hand-rolling contrast math or an accessible-name computer.

tests:
  - |
    AC1 (ordering, all three types) - unit test in
    `tests/db/notifications-query.test.ts`:
    ```ts
    it("returns notifications most-recent-first", () => {
      const db = freshDb();
      const userId = insertUser(db, "tenant@example.com");
      insertNotification(db, { userId, type: "due", sentAt: "2026-09-01 10:00:00" });
      insertNotification(db, { userId, type: "overdue", sentAt: "2026-09-10 10:00:00" });
      insertNotification(db, { userId, type: "confirmation", sentAt: "2026-09-05 10:00:00" });

      const result = getNotificationsForUser(db, userId);

      expect(result.map((n) => n.type)).toEqual(["overdue", "confirmation", "due"]);
    });
    ```
    Minimal code: the `notifications` table/migration plus
    `getNotificationsForUser`'s `.orderBy(desc(notifications.sentAt))`.
  - |
    AC2 (empty state) - unit test in `tests/db/notifications-query.test.ts`
    plus e2e in `e2e/notifications.spec.ts`:
    ```ts
    it("returns an empty array for a user with no notifications", () => {
      const db = freshDb();
      expect(getNotificationsForUser(db, 999999)).toEqual([]);
    });
    ```
    ```ts
    test("AC2: a tenant with no notifications sees an empty-state message", async ({ page, context }) => {
      await setSessionCookie(context, await mintSessionToken({ sub: "999999", role: "employee" }));
      await page.goto("/notifications");
      await expect(page.getByText(/no notifications yet/i)).toBeVisible();
      await expect(page.getByRole("list")).toHaveCount(0);
    });
    ```
    Minimal code: the page's `rows.length === 0` branch rendering the
    empty-state `<p>`.
  - |
    AC3 (type, date, channel per entry) - e2e in `e2e/notifications.spec.ts`:
    ```ts
    test("AC3: each entry shows its type, date sent, and channel(s)", async ({ page, context }) => {
      await setSessionCookie(context, await mintSessionToken({ sub: "1", role: "employee" }));
      await page.goto("/notifications");
      const items = page.getByRole("listitem");
      await expect(items.first()).toContainText(/Due|Confirmation|Overdue/);
      await expect(items.first()).toContainText(/\d{4}-\d{2}-\d{2}/);
      await expect(items.first()).toContainText(/Email|In-app/);
    });
    ```
    Minimal code: the `<li>` markup rendering `TYPE_LABEL`,
    `formatSentAt(n.sentAt)`, and joined `CHANNEL_LABEL` values.
  - |
    AC4 (screen-reader text alternative) - e2e in
    `e2e/notifications.spec.ts` using `@axe-core/playwright` plus an
    explicit accessible-name check:
    ```ts
    test("AC4: each entry has a correct accessible name", async ({ page, context }) => {
      await setSessionCookie(context, await mintSessionToken({ sub: "1", role: "employee" }));
      await page.goto("/notifications");
      await expect(page.getByRole("listitem").first()).toHaveAccessibleName(/Due|Confirmation|Overdue/);

      const results = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(results.violations).toEqual([]);
    });
    ```
    Minimal code: the explicit `aria-label` on each `<li>` mirroring its
    visible text.
  - |
    AC5 (4.5:1 contrast) - e2e in `e2e/notifications.spec.ts`:
    ```ts
    test("AC5: entries meet WCAG AA contrast", async ({ page, context }) => {
      await setSessionCookie(context, await mintSessionToken({ sub: "1", role: "employee" }));
      await page.goto("/notifications");
      const results = await new AxeBuilder({ page }).include("main").withRules(["color-contrast"]).analyze();
      expect(results.violations).toEqual([]);
    });
    ```
    Minimal code: none expected beyond the plain semantic markup above -
    default browser black-on-white body text is 21:1; this test exists to
    make that fact enforced and regression-proof rather than assumed.
  - |
    AC6 (no delete/archive action) - e2e in `e2e/notifications.spec.ts`:
    ```ts
    test("AC6: no delete or archive action is available", async ({ page, context }) => {
      await setSessionCookie(context, await mintSessionToken({ sub: "1", role: "employee" }));
      await page.goto("/notifications");
      await expect(page.getByRole("button", { name: /delete|archive/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /delete|archive/i })).toHaveCount(0);
    });
    ```
    Minimal code: none - satisfied by omission; the test guards against a
    future regression.
  - |
    AC7 (own tenant only) - unit test in
    `tests/db/notifications-query.test.ts` plus e2e in
    `e2e/notifications.spec.ts`:
    ```ts
    it("does not return another user's notifications", () => {
      const db = freshDb();
      const tenantA = insertUser(db, "a@example.com");
      const tenantB = insertUser(db, "b@example.com");
      insertNotification(db, { userId: tenantB, type: "due", sentAt: "2026-09-10 10:00:00" });

      expect(getNotificationsForUser(db, tenantA)).toEqual([]);
    });
    ```
    ```ts
    test("AC7: an employee cannot see the manager's notifications", async ({ page, context }) => {
      await setSessionCookie(context, await mintSessionToken({ sub: "1", role: "employee" }));
      await page.goto("/notifications");
      await expect(page.getByText(/manager-only-notification-marker/i)).toHaveCount(0);
    });
    ```
    Minimal code: `getNotificationsForUser`'s `where(eq(notifications.userId, userId))`.

assumptions_or_open_questions:
  - |
    The story's language ("tenant", "payment-due alerts") comes from the
    parent epic's domain (rent/payment) and does not match this
    repository's actual domain (an expense tracker with `employee`/
    `manager` roles - there is no `tenant` role or payment concept anywhere
    in `src/db/schema.ts`). This plan treats "tenant" as "the authenticated
    user viewing their own notifications" (any role), and keeps the AC1
    type vocabulary (`due`/`confirmation`/`overdue`) literally as the
    `notifications.type` enum without inventing a payments domain. Please
    confirm this reading is correct, or point to where the real domain
    model for this concept lives if one exists outside this repo.
  - |
    No login flow exists yet in the root Next.js app (`src/app/login/page.tsx`
    is still a placeholder despite EXP-STORY-003 being merged - that story
    appears to have only been implemented against the separate `server/`
    + `web/` prototype stack). There is therefore no established convention
    for what the session JWT's `sub` claim contains once real login ships.
    This plan assumes `sub` will be `String(users.id)` (the only identifier
    `users` has) and reads `Number(session.sub)` accordingly; if the real
    login story lands with a different `sub` format, `src/app/notifications/page.tsx`'s
    user-id parsing will need to change to match.
  - |
    `channels` is modelled as a single comma-separated text column (e.g.
    `"email,in_app"`) rather than a normalized join table, matching this
    schema's existing preference for plain text/enum columns over
    additional tables for small fixed sets. If multi-channel delivery
    needs to be queried/filtered on later (e.g. "show only email
    notifications"), this should become a proper child table instead.
  - |
    Assumed no notification-sending mechanism is in scope here (that is a
    separate, not-yet-implemented story per the parent epic's description);
    this plan only adds enough persistence to read and demo a history, via
    seed data.

package_dependencies:
  - name: "@axe-core/playwright"
    version: "^4.10.1"
    ecosystem: npm
    rationale: |
      AC4 (screen-reader text alternatives) and AC5 (WCAG 2.1 AA 4.5:1
      contrast) are objective, engine-verifiable properties best checked
      against real computed accessibility-tree/CSS output in a real
      browser via axe-core's `color-contrast` and name/role/value rules,
      rather than hand-rolling a contrast-ratio calculator or an
      accessible-name algorithm in test code. The project already runs
      Playwright for e2e; `@axe-core/playwright` is the standard adapter
      for it and is not already a dependency anywhere in the repo.

notes: |
  The repository actually contains three parallel stacks: the root
  Next.js + drizzle app (the active one - `src/middleware.ts`,
  `src/lib/auth/route-policy.ts`, `src/db/schema.ts`, tested by the
  `chromium` Playwright project), and two superseded EXP-STORY-003
  prototypes (`server/` - Express + Prisma, `web/` - Vite + React,
  exercised only by `e2e/auth.spec.ts` under the `auth-chromium` project).
  This plan touches only the root app, matching where `EXPENSE-TRACKER-2-STORY-004`
  (route guards) and the drizzle schema/migrations already live.

  ```mermaid
  flowchart TD
    schema["src/db/schema.ts\n(notifications table)"]
    queries["src/db/queries/notifications.ts\ngetNotificationsForUser()"]
    runtime["src/db/runtime.ts\ndb singleton"]
    page["src/app/notifications/page.tsx"]
    dashboard["src/app/dashboard/page.tsx\n(nav link)"]
    session["src/lib/auth/session.ts\nverifySession (reused, unmodified)"]
    middleware["src/middleware.ts\n(unmodified: default 'authenticated')"]
    policy["src/lib/auth/route-policy.ts\n(unmodified: classifyRoute default)"]
    seedData["src/lib/seed-data.ts"]
    seed["src/db/seed.ts"]

    schema --> queries
    runtime --> page
    queries --> page
    session -->|"reads SESSION_COOKIE to get session.sub"| page
    middleware --> policy
    middleware -->|"guards /notifications via default 'authenticated' policy, before page runs"| page
    dashboard -->|"links to"| page
    seedData --> seed
    seed -->|"populates notifications for e2e/demo"| schema

    classDef touched fill:#f96,color:#000
    class schema,queries,runtime,page,dashboard,seedData,seed touched
  ```
