import { beforeEach, describe, expect, it } from "vitest";

import type { Db } from "../../db/client.js";
import { freshDb } from "../../../tests/helpers/db.js";
import { listExpensesForUser } from "./queries.js";

function insertUser(db: Db, email: string): number {
  const result = db.$client
    .prepare(
      "INSERT INTO users (email, password_hash, role) VALUES (?, 'hashed-secret', 'employee')",
    )
    .run(email);
  return Number(result.lastInsertRowid);
}

function insertExpense(
  db: Db,
  fields: {
    userId: number;
    amountCents?: number;
    category?: string;
    status?: string;
    expenseDate?: string;
  },
): number {
  const result = db.$client
    .prepare(
      `INSERT INTO expenses (user_id, amount_cents, description, category, expense_date, status)
       VALUES (?, ?, 'Some expense', ?, ?, ?)`,
    )
    .run(
      fields.userId,
      fields.amountCents ?? 4200,
      fields.category ?? "Meals",
      fields.expenseDate ?? "2026-08-01",
      fields.status ?? "submitted",
    );
  return Number(result.lastInsertRowid);
}

describe("listExpensesForUser", () => {
  let db: Db;
  let ownerId: number;
  let otherId: number;

  beforeEach(() => {
    db = freshDb();
    ownerId = insertUser(db, "owner@example.com");
    otherId = insertUser(db, "other@example.com");
  });

  it("returns each expense's id, date, amount, category and status (AC1)", () => {
    const id = insertExpense(db, {
      userId: ownerId,
      amountCents: 4250,
      category: "Meals",
      status: "submitted",
      expenseDate: "2026-08-10",
    });

    const rows = listExpensesForUser(db, ownerId);

    expect(rows).toEqual([
      {
        id,
        expenseDate: "2026-08-10",
        amountCents: 4250,
        category: "Meals",
        status: "submitted",
      },
    ]);
  });

  it("returns only the owner's expenses, never another user's (AC2)", () => {
    insertExpense(db, { userId: ownerId, category: "Travel" });
    insertExpense(db, { userId: ownerId, category: "Lodging" });
    insertExpense(db, { userId: otherId, category: "Meals" });

    const rows = listExpensesForUser(db, ownerId);

    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.category !== "Meals")).toBe(true);
  });

  it("returns an empty array for a user with no expenses (AC4)", () => {
    expect(listExpensesForUser(db, ownerId)).toEqual([]);
  });

  it("orders newest first by expense date, tie-broken by id descending", () => {
    const older = insertExpense(db, { userId: ownerId, expenseDate: "2026-08-01" });
    const newerA = insertExpense(db, { userId: ownerId, expenseDate: "2026-08-10" });
    const newerB = insertExpense(db, { userId: ownerId, expenseDate: "2026-08-10" });

    const ids = listExpensesForUser(db, ownerId).map((r) => r.id);

    expect(ids).toEqual([newerB, newerA, older]);
  });
});
