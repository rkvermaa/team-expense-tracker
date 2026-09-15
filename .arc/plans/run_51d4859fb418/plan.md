summary: |
  This codebase is a team expense-approval tracker (users, expenses, status_history) with no
  existing tenant/rent/payment/notification domain at all — a repo-wide search confirmed zero
  references to "tenant", "rent", "landlord", "lease", or "notification", and
  `tests/db/schema-shape.test.ts` locks the schema to exactly the expense-tracker's four tables.
  Implementing EXPENSE-TRACKER-2-STORY-016 therefore requires introducing a minimal new domain —
  a `rent_payments` record (a due date + optional paid timestamp, owned by an existing `users`
  row acting as the tenant) and a `notifications` record (an in-app log of alerts sent) — plus a
  pure `runOverdueCheck` function that scans for unpaid, past-due rent payments and records a
  `payment_overdue` notification for each one not already notified. This was flagged to the
  reviewer as a domain mismatch before drafting and confirmed acceptable to proceed on this basis.
  Scope is kept to exactly what the three ACs require: no scheduler/cron wiring, no email/push
  delivery channel, and no UI, since the ACs only test that a notification record is (or isn't)
  produced under the three given conditions.
scope:
  - description: |
      Add two tables to the Drizzle schema:
      - `rent_payments`: `id`, `tenant_id` (FK -> `users.id`), `due_date` (text, `YYYY-MM-DD`),
        `amount_cents` (check `> 0`, mirroring the `expenses` amount check), `paid_at` (nullable
        text timestamp — `NULL` means "no payment recorded against it"), `created_at`.
      - `notifications`: `id`, `user_id` (FK -> `users.id`), `type` (text, check constrained to
        `('payment_overdue')` for now — mirrors the `expenses`/`status_history` status-check
        pattern), `rent_payment_id` (FK -> `rent_payments.id`), `created_at`, with a
        `UNIQUE(rent_payment_id, type)` index so re-running the check never double-notifies the
        same overdue payment.
      Then run `npm run db:generate` to produce the migration SQL + snapshot, and
      `npm run db:migrate` (or let `freshDb()` apply it) to verify it applies cleanly.
    files:
      - src/db/schema.ts
      - drizzle/<generated>.sql (name assigned by drizzle-kit, e.g. 0003_*.sql)
      - drizzle/meta/<generated>_snapshot.json
      - drizzle/meta/_journal.json
    rationale: |
      Mirrors the existing `expenses`/`status_history` table style exactly (same column-naming,
      same `check(...)` usage imported from `drizzle-orm/sqlite-core`, same `references(() =>
      ...)` FK pattern) so the new tables are indistinguishable in convention from the rest of the
      schema. `paid_at IS NULL` is the single source of truth for "no payment recorded against
      it" (AC1/AC3), and `due_date` comparison against the check's reference date is the single
      source of truth for "has/has not passed" (AC1/AC2).
  - description: |
      Update the locked-down schema-shape test to include the two new tables in its exact-match
      assertion, since it currently enumerates the full table list and would otherwise fail as
      soon as the new tables exist.
      Before: `["__drizzle_migrations", "expenses", "status_history", "users"]`
      After: `["__drizzle_migrations", "expenses", "notifications", "rent_payments",
      "status_history", "users"]`
    files:
      - tests/db/schema-shape.test.ts
    rationale: |
      This test is an intentional guardrail on the brief's entity set; touching it is a required,
      visible part of this change rather than an incidental fix, so it's called out explicitly
      instead of being silently rewritten.
  - description: |
      Add schema-level tests for the two new tables (required columns, FK enforcement, check
      constraints, default `paid_at` is null), one file per table, mirroring the existing
      per-table test style (see `tests/db/expenses-table.test.ts`,
      `tests/db/status-history-table.test.ts`).
    files:
      - tests/db/rent-payments-table.test.ts
      - tests/db/notifications-table.test.ts
    rationale: |
      Keeps the same "one describe block per table, PRAGMA table_info + insert/throw assertions"
      convention already used for `expenses` and `status_history`, so schema regressions are
      caught the same way as the rest of the codebase, independent of the behavior-level overdue
      check tests below.
  - description: |
      Implement the overdue-check function itself.
      ```ts
      export type OverdueNotification = {
        id: number;
        userId: number;
        rentPaymentId: number;
      };

      export function runOverdueCheck(
        db: Db,
        asOf: Date = new Date(),
      ): OverdueNotification[]
      ```
      It selects `rent_payments` rows where `due_date < asOf` (formatted `YYYY-MM-DD`) and
      `paid_at IS NULL`, skips any that already have a `payment_overdue` row in `notifications`
      for that `rent_payment_id`, inserts one `notifications` row per remaining candidate inside
      a single `db.transaction`, and returns the list created on this run.
    files:
      - src/lib/notifications/overdue-check.ts
      - src/lib/notifications/overdue-check.test.ts
    rationale: |
      Colocates logic + test the same way `src/lib/auth/route-policy.ts` /
      `route-policy.test.ts` and `src/lib/auth/session.ts` / `session.test.ts` do, rather than
      nesting it under the integration-style `tests/db/` folder, since this is pure business
      logic over the schema rather than a schema-shape assertion.
tests:
  - |
    AC1 — GIVEN a rent due date passes WHEN no payment has been recorded THEN the tenant
    receives a payment-overdue notification. In
    `src/lib/notifications/overdue-check.test.ts`:
    ```ts
    it("creates a payment-overdue notification when a due date has passed with no payment recorded", () => {
      const tenantId = insertUser(db, "tenant@example.com");
      const rentPaymentId = insertRentPayment(db, { tenantId, dueDate: "2026-09-01" });

      const created = runOverdueCheck(db, new Date("2026-09-15"));

      expect(created).toHaveLength(1);
      expect(created[0]).toMatchObject({ userId: tenantId, rentPaymentId });
    });
    ```
    This test must fail first because `runOverdueCheck` and the `rent_payments`/`notifications`
    tables don't exist yet.
  - |
    AC2 — GIVEN a rent due date has not yet passed WHEN the overdue check runs THEN no overdue
    notification is sent for that due date. In `src/lib/notifications/overdue-check.test.ts`:
    ```ts
    it("does not send an overdue notification when the due date has not yet passed", () => {
      const tenantId = insertUser(db, "tenant2@example.com");
      insertRentPayment(db, { tenantId, dueDate: "2026-09-30" });

      const created = runOverdueCheck(db, new Date("2026-09-15"));

      expect(created).toHaveLength(0);
    });
    ```
  - |
    AC3 — GIVEN a payment is recorded after the due date but before the overdue check runs WHEN
    the check runs THEN no overdue notification is sent. In
    `src/lib/notifications/overdue-check.test.ts`:
    ```ts
    it("does not send an overdue notification when a payment was recorded before the check runs", () => {
      const tenantId = insertUser(db, "tenant3@example.com");
      insertRentPayment(db, {
        tenantId,
        dueDate: "2026-09-01",
        paidAt: "2026-09-05 10:00:00",
      });

      const created = runOverdueCheck(db, new Date("2026-09-15"));

      expect(created).toHaveLength(0);
    });
    ```
assumptions_or_open_questions:
  - |
    Biggest open item, already surfaced to and accepted by the reviewer: this codebase has no
    tenant/rent/payment/notification domain at all today (confirmed by a repo-wide search and by
    `tests/db/schema-shape.test.ts` locking the schema to the expense-tracker's four tables).
    This plan invents the minimal schema needed to satisfy the three ACs literally, rather than
    reinterpreting "payment overdue" onto the existing `expenses` concept. Flagging again in case
    the "looks good" approval was of the direction rather than of specific schema/API choices
    below.
  - |
    "Tenant" is modeled as any existing `users` row (via `rent_payments.tenant_id`); no new role
    value is added and `users_role_check` (`'employee'`/`'manager'`) is left untouched, since no
    AC requires role-gated behavior for this feature.
  - |
    A due date "passes" only once it is strictly before the day the check runs — a due date equal
    to the check's reference date is treated as not yet overdue (`due_date < asOf`, not `<=`).
  - |
    "The tenant receives a payment-overdue notification" (AC1) is satisfied by persisting a row
    in a new `notifications` table. No email/push/UI delivery channel is implemented — the ACs
    only test whether a notification record is produced, not how it reaches the tenant, and the
    epic's "in-app and/or email" wording leaves the channel open. This is a smaller scope than
    the epic implies; flag if a specific channel is actually required for this story.
  - |
    `runOverdueCheck` is made idempotent per rent payment (a `UNIQUE(rent_payment_id, type)`
    index prevents a duplicate row if the check runs again while a payment is still unpaid) even
    though no AC explicitly requires repeat-run behavior — this is a judgment call to keep the
    function safe to schedule, not speculative feature work beyond it.
  - |
    No scheduler/cron/API route triggers `runOverdueCheck` — this plan implements only the pure,
    testable check function per the ACs. Wiring it to run periodically is a separate concern not
    described by any AC.
  - |
    AC3's "payment is recorded" is satisfied in tests by directly setting `rent_payments.paid_at`
    (there is no payment-recording API/UI in this codebase to call instead, and the epic itself
    frames this story as sitting "beyond the reminder and confirmation" stories, implying those
    are separate/future work).
package_dependencies: []
notes: |
  Conventions mirrored from existing code: `src/db/schema.ts` uses `check(...)` from
  `drizzle-orm/sqlite-core` for enum-like columns (see `expenses_status_check`) — the new
  `notifications_type_check` follows the same shape. `tests/db/expenses-table.test.ts` and
  `tests/db/status-history-table.test.ts` establish the "PRAGMA table_info + raw `$client`
  inserts that assert on thrown `FOREIGN KEY`/`CHECK` errors" pattern reused for the two new
  table tests. `src/lib/auth/route-policy.ts`/`.test.ts` establishes the colocated-test
  convention reused for `overdue-check.ts`.

  ```mermaid
  flowchart TD
    schema[src/db/schema.ts]:::touched
    client[src/db/client.ts]
    migrate[src/db/migrate.ts]
    freshDb[tests/helpers/db.ts]
    overdue[src/lib/notifications/overdue-check.ts]:::touched
    overdueTest[src/lib/notifications/overdue-check.test.ts]:::touched
    shapeTest[tests/db/schema-shape.test.ts]:::touched
    rentTest[tests/db/rent-payments-table.test.ts]:::touched
    notifTest[tests/db/notifications-table.test.ts]:::touched

    schema -->|adds rent_payments & notifications tables| client
    client --> freshDb
    migrate -->|applies new migration| freshDb
    freshDb -->|asserts full table list incl. new tables| shapeTest
    freshDb -->|asserts new table constraints| rentTest
    freshDb -->|asserts new table constraints| notifTest
    freshDb -->|provides migrated in-memory db| overdueTest
    overdue -->|reads/writes via Db type| client
    overdueTest -->|drives the 3 AC tests| overdue

    classDef touched fill:#f96,color:#000
  ```
