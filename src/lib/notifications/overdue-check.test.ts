import { beforeEach, describe, expect, it } from "vitest";

import type { Db } from "../../db/client.js";
import { freshDb } from "../../../tests/helpers/db.js";
import { runOverdueCheck } from "./overdue-check.js";

function insertUser(db: Db, email: string): number {
  const result = db.$client
    .prepare(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'employee')",
    )
    .run(email, "hashed-secret");
  return Number(result.lastInsertRowid);
}

function insertRentPayment(
  db: Db,
  fields: { tenantId: number; dueDate: string; paidAt?: string },
): number {
  const result = db.$client
    .prepare(
      `INSERT INTO rent_payments (tenant_id, due_date, amount_cents, paid_at)
       VALUES (?, ?, 150000, ?)`,
    )
    .run(fields.tenantId, fields.dueDate, fields.paidAt ?? null);
  return Number(result.lastInsertRowid);
}

describe("runOverdueCheck", () => {
  let db: Db;

  beforeEach(() => {
    db = freshDb();
  });

  it("creates a payment-overdue notification when a due date has passed with no payment recorded", () => {
    const tenantId = insertUser(db, "tenant@example.com");
    const rentPaymentId = insertRentPayment(db, {
      tenantId,
      dueDate: "2026-09-01",
    });

    const created = runOverdueCheck(db, new Date("2026-09-15"));

    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ userId: tenantId, rentPaymentId });
  });

  it("does not send an overdue notification when the due date has not yet passed", () => {
    const tenantId = insertUser(db, "tenant2@example.com");
    insertRentPayment(db, { tenantId, dueDate: "2026-09-30" });

    const created = runOverdueCheck(db, new Date("2026-09-15"));

    expect(created).toHaveLength(0);
  });

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

  it("does not send a duplicate notification for a payment already notified", () => {
    const tenantId = insertUser(db, "tenant4@example.com");
    const rentPaymentId = insertRentPayment(db, {
      tenantId,
      dueDate: "2026-09-01",
    });

    runOverdueCheck(db, new Date("2026-09-15"));
    const secondRun = runOverdueCheck(db, new Date("2026-09-16"));

    expect(secondRun).toHaveLength(0);
    const notifications = db.$client
      .prepare("SELECT COUNT(*) as count FROM notifications WHERE rent_payment_id = ?")
      .get(rentPaymentId) as { count: number };
    expect(notifications.count).toBe(1);
  });
});
