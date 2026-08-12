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

function insertExpense(
  db: Db,
  fields: { userId: number; amountCents?: number; status?: string },
) {
  return db.$client
    .prepare(
      `INSERT INTO expenses (user_id, amount_cents, description, expense_date${fields.status ? ", status" : ""})
       VALUES (?, ?, 'Team lunch', '2026-08-01'${fields.status ? ", ?" : ""})`,
    )
    .run(
      ...[
        fields.userId,
        fields.amountCents ?? 4200,
        ...(fields.status ? [fields.status] : []),
      ],
    );
}

describe("expenses table (AC2)", () => {
  let db: Db;
  let ownerId: number;

  beforeEach(() => {
    db = freshDb();
    ownerId = insertUser(db, "owner@example.com");
  });

  it("has the expected required columns", () => {
    const columns = db.$client
      .prepare("PRAGMA table_info(expenses)")
      .all() as ColumnInfo[];
    const byName = new Map(columns.map((c) => [c.name, c]));

    expect(byName.get("id")?.pk).toBe(1);
    for (const col of [
      "user_id",
      "amount_cents",
      "description",
      "expense_date",
      "status",
    ]) {
      expect(byName.get(col)?.notnull, `${col} should be NOT NULL`).toBe(1);
    }
  });

  it("links each expense to an existing owner and defaults status to 'draft'", () => {
    const result = insertExpense(db, { userId: ownerId });
    const row = db.$client
      .prepare("SELECT user_id, status FROM expenses WHERE id = ?")
      .get(result.lastInsertRowid) as { user_id: number; status: string };

    expect(row.user_id).toBe(ownerId);
    expect(row.status).toBe("draft");
  });

  it("rejects an expense whose owner does not exist", () => {
    expect(() => insertExpense(db, { userId: 9999 })).toThrow(
      /FOREIGN KEY/i,
    );
  });

  it("rejects a status outside the allowed set", () => {
    expect(() =>
      insertExpense(db, { userId: ownerId, status: "bogus" }),
    ).toThrow(/CHECK/i);
  });

  it("rejects a non-positive amount", () => {
    expect(() =>
      insertExpense(db, { userId: ownerId, amountCents: 0 }),
    ).toThrow(/CHECK/i);
  });
});
