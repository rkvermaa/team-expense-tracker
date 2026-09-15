import { beforeEach, describe, expect, it } from "vitest";

import type { Db } from "../../src/db/client.js";
import { freshDb } from "../helpers/db.js";

interface ColumnInfo {
  name: string;
  notnull: number;
  pk: number;
}

function insertUser(db: Db, email: string): number {
  const result = db.$client
    .prepare(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'employee')",
    )
    .run(email, "hashed-secret");
  return Number(result.lastInsertRowid);
}

function insertRentPayment(db: Db, tenantId: number): number {
  const result = db.$client
    .prepare(
      `INSERT INTO rent_payments (tenant_id, due_date, amount_cents)
       VALUES (?, '2026-09-01', 150000)`,
    )
    .run(tenantId);
  return Number(result.lastInsertRowid);
}

function insertNotification(
  db: Db,
  fields: { userId: number; rentPaymentId: number; type?: string },
) {
  return db.$client
    .prepare(
      `INSERT INTO notifications (user_id, rent_payment_id, type)
       VALUES (?, ?, ?)`,
    )
    .run(fields.userId, fields.rentPaymentId, fields.type ?? "payment_overdue");
}

describe("notifications table", () => {
  let db: Db;
  let tenantId: number;
  let rentPaymentId: number;

  beforeEach(() => {
    db = freshDb();
    tenantId = insertUser(db, "tenant@example.com");
    rentPaymentId = insertRentPayment(db, tenantId);
  });

  it("has the expected required columns", () => {
    const columns = db.$client
      .prepare("PRAGMA table_info(notifications)")
      .all() as ColumnInfo[];
    const byName = new Map(columns.map((c) => [c.name, c]));

    expect(byName.get("id")?.pk).toBe(1);
    for (const col of ["user_id", "type", "rent_payment_id", "created_at"]) {
      expect(byName.get(col)?.notnull, `${col} should be NOT NULL`).toBe(1);
    }
  });

  it("links each notification to an existing user and rent payment", () => {
    const result = insertNotification(db, { userId: tenantId, rentPaymentId });
    const row = db.$client
      .prepare("SELECT user_id, rent_payment_id, type FROM notifications WHERE id = ?")
      .get(result.lastInsertRowid) as {
      user_id: number;
      rent_payment_id: number;
      type: string;
    };

    expect(row.user_id).toBe(tenantId);
    expect(row.rent_payment_id).toBe(rentPaymentId);
    expect(row.type).toBe("payment_overdue");
  });

  it("rejects a notification for a nonexistent user", () => {
    expect(() =>
      insertNotification(db, { userId: 9999, rentPaymentId }),
    ).toThrow(/FOREIGN KEY/i);
  });

  it("rejects a notification for a nonexistent rent payment", () => {
    expect(() =>
      insertNotification(db, { userId: tenantId, rentPaymentId: 9999 }),
    ).toThrow(/FOREIGN KEY/i);
  });

  it("rejects a type outside the allowed set", () => {
    expect(() =>
      insertNotification(db, { userId: tenantId, rentPaymentId, type: "bogus" }),
    ).toThrow(/CHECK/i);
  });

  it("rejects a duplicate payment_overdue notification for the same rent payment", () => {
    insertNotification(db, { userId: tenantId, rentPaymentId });
    expect(() =>
      insertNotification(db, { userId: tenantId, rentPaymentId }),
    ).toThrow(/UNIQUE/i);
  });
});
