import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import type { Db } from "@/db/client";
import { expenses, statusHistory, users } from "@/db/schema";
import { freshDb } from "../../../tests/helpers/db";
import { deleteExpense } from "./delete";

function insertUser(db: Db, email: string): number {
  return db
    .insert(users)
    .values({ email, passwordHash: "hashed-secret", role: "employee" })
    .returning({ id: users.id })
    .get().id;
}

function insertExpense(
  db: Db,
  fields: { userId: number; status: "draft" | "submitted" | "approved" | "rejected" },
): number {
  return db
    .insert(expenses)
    .values({
      userId: fields.userId,
      amountCents: 1000,
      description: "Team lunch",
      expenseDate: "2026-08-01",
      status: fields.status,
    })
    .returning({ id: expenses.id })
    .get().id;
}

describe("deleteExpense", () => {
  let db: Db;
  let ownerId: number;

  beforeEach(() => {
    db = freshDb();
    ownerId = insertUser(db, "owner@example.com");
  });

  it("AC5: deletes a draft expense and it no longer exists", () => {
    const expenseId = insertExpense(db, { userId: ownerId, status: "draft" });

    const result = deleteExpense(db, { expenseId, userId: ownerId });

    expect(result).toEqual({ ok: true });
    const row = db.select().from(expenses).where(eq(expenses.id, expenseId)).get();
    expect(row).toBeUndefined();
  });

  it("AC5: deletes a rejected expense that has status_history rows without a FK error", () => {
    const expenseId = insertExpense(db, { userId: ownerId, status: "rejected" });
    db.insert(statusHistory)
      .values({ expenseId, newStatus: "rejected", actorId: ownerId })
      .run();

    const result = deleteExpense(db, { expenseId, userId: ownerId });

    expect(result).toEqual({ ok: true });
    const expenseRow = db.select().from(expenses).where(eq(expenses.id, expenseId)).get();
    expect(expenseRow).toBeUndefined();
    const historyRows = db
      .select()
      .from(statusHistory)
      .where(eq(statusHistory.expenseId, expenseId))
      .all();
    expect(historyRows).toHaveLength(0);
  });

  it("AC3: rejects deleting a submitted expense with 409 and leaves it intact", () => {
    const expenseId = insertExpense(db, { userId: ownerId, status: "submitted" });

    const result = deleteExpense(db, { expenseId, userId: ownerId });

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "Only draft or rejected expenses can be deleted",
    });
    const row = db.select().from(expenses).where(eq(expenses.id, expenseId)).get();
    expect(row).toBeDefined();
  });

  it("AC3: rejects deleting an approved expense with 409 and leaves it intact", () => {
    const expenseId = insertExpense(db, { userId: ownerId, status: "approved" });

    const result = deleteExpense(db, { expenseId, userId: ownerId });

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "Only draft or rejected expenses can be deleted",
    });
    const row = db.select().from(expenses).where(eq(expenses.id, expenseId)).get();
    expect(row).toBeDefined();
  });

  it("rejects deleting another user's expense with 404", () => {
    const otherUserId = insertUser(db, "other@example.com");
    const expenseId = insertExpense(db, { userId: otherUserId, status: "draft" });

    const result = deleteExpense(db, { expenseId, userId: ownerId });

    expect(result).toEqual({ ok: false, status: 404, error: "Expense not found" });
    const row = db.select().from(expenses).where(eq(expenses.id, expenseId)).get();
    expect(row).toBeDefined();
  });

  it("rejects deleting a nonexistent expense with 404", () => {
    const result = deleteExpense(db, { expenseId: 999999, userId: ownerId });

    expect(result).toEqual({ ok: false, status: 404, error: "Expense not found" });
  });
});
