import { beforeEach, describe, expect, it } from "vitest";

import type { Db } from "../../src/db/client.js";
import { freshDb } from "../helpers/db.js";

interface ColumnInfo {
  name: string;
  notnull: number;
}

function insertUser(db: Db, email: string): number {
  const result = db.$client
    .prepare(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'employee')",
    )
    .run(email, "hashed-secret");
  return Number(result.lastInsertRowid);
}

function insertExpense(db: Db, userId: number): number {
  const result = db.$client
    .prepare(
      `INSERT INTO expenses (user_id, amount_cents, description, expense_date)
       VALUES (?, 4200, 'Team lunch', '2026-08-01')`,
    )
    .run(userId);
  return Number(result.lastInsertRowid);
}

function insertHistory(
  db: Db,
  expenseId: number,
  newStatus: string,
  actorId: number,
) {
  return db.$client
    .prepare(
      "INSERT INTO status_history (expense_id, new_status, actor_id) VALUES (?, ?, ?)",
    )
    .run(expenseId, newStatus, actorId);
}

describe("status_history table (AC3)", () => {
  let db: Db;
  let actorId: number;
  let expenseId: number;

  beforeEach(() => {
    db = freshDb();
    actorId = insertUser(db, "actor@example.com");
    expenseId = insertExpense(db, actorId);
  });

  it("requires expense, new status, actor, and timestamp columns", () => {
    const columns = db.$client
      .prepare("PRAGMA table_info(status_history)")
      .all() as ColumnInfo[];
    const byName = new Map(columns.map((c) => [c.name, c]));

    for (const col of ["expense_id", "new_status", "actor_id", "changed_at"]) {
      expect(byName.get(col)?.notnull, `${col} should be NOT NULL`).toBe(1);
    }
  });

  it("records a transition with an auto-populated timestamp", () => {
    const result = insertHistory(db, expenseId, "submitted", actorId);
    const row = db.$client
      .prepare(
        "SELECT expense_id, new_status, actor_id, changed_at FROM status_history WHERE id = ?",
      )
      .get(result.lastInsertRowid) as {
      expense_id: number;
      new_status: string;
      actor_id: number;
      changed_at: string;
    };

    expect(row.expense_id).toBe(expenseId);
    expect(row.new_status).toBe("submitted");
    expect(row.actor_id).toBe(actorId);
    expect(Number.isNaN(Date.parse(row.changed_at))).toBe(false);
  });

  it("rejects a transition for a nonexistent expense", () => {
    expect(() => insertHistory(db, 9999, "submitted", actorId)).toThrow(
      /FOREIGN KEY/i,
    );
  });

  it("rejects a transition by a nonexistent actor", () => {
    expect(() => insertHistory(db, expenseId, "submitted", 9999)).toThrow(
      /FOREIGN KEY/i,
    );
  });

  it("rejects a status outside the allowed set", () => {
    expect(() => insertHistory(db, expenseId, "bogus", actorId)).toThrow(
      /CHECK/i,
    );
  });

  it("keeps every transition for an expense, in insertion order", () => {
    insertHistory(db, expenseId, "submitted", actorId);
    insertHistory(db, expenseId, "approved", actorId);

    const rows = db.$client
      .prepare(
        "SELECT new_status FROM status_history WHERE expense_id = ? ORDER BY id",
      )
      .all(expenseId) as { new_status: string }[];

    expect(rows.map((r) => r.new_status)).toEqual(["submitted", "approved"]);
  });
});
