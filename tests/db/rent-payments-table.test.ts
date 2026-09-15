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

function insertRentPayment(
  db: Db,
  fields: { tenantId: number; dueDate?: string; amountCents?: number },
) {
  return db.$client
    .prepare(
      `INSERT INTO rent_payments (tenant_id, due_date, amount_cents)
       VALUES (?, ?, ?)`,
    )
    .run(
      fields.tenantId,
      fields.dueDate ?? "2026-09-01",
      fields.amountCents ?? 150000,
    );
}

describe("rent_payments table", () => {
  let db: Db;
  let tenantId: number;

  beforeEach(() => {
    db = freshDb();
    tenantId = insertUser(db, "tenant@example.com");
  });

  it("has the expected required columns", () => {
    const columns = db.$client
      .prepare("PRAGMA table_info(rent_payments)")
      .all() as ColumnInfo[];
    const byName = new Map(columns.map((c) => [c.name, c]));

    expect(byName.get("id")?.pk).toBe(1);
    for (const col of ["tenant_id", "due_date", "amount_cents"]) {
      expect(byName.get(col)?.notnull, `${col} should be NOT NULL`).toBe(1);
    }
    expect(byName.get("paid_at")?.notnull).toBe(0);
  });

  it("links each rent payment to an existing tenant and defaults paid_at to null", () => {
    const result = insertRentPayment(db, { tenantId });
    const row = db.$client
      .prepare("SELECT tenant_id, paid_at FROM rent_payments WHERE id = ?")
      .get(result.lastInsertRowid) as { tenant_id: number; paid_at: string | null };

    expect(row.tenant_id).toBe(tenantId);
    expect(row.paid_at).toBeNull();
  });

  it("rejects a rent payment whose tenant does not exist", () => {
    expect(() => insertRentPayment(db, { tenantId: 9999 })).toThrow(
      /FOREIGN KEY/i,
    );
  });

  it("rejects a non-positive amount", () => {
    expect(() =>
      insertRentPayment(db, { tenantId, amountCents: 0 }),
    ).toThrow(/CHECK/i);
  });
});
