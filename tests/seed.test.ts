import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { seed } from "../src/db/seed.js";
import { expenses, statusHistory, users } from "../src/db/schema.js";
import type { Db } from "../src/db/client.js";
import { verifyPassword } from "../src/lib/password.js";
import { EMPLOYEE_EMAIL, MANAGER_EMAIL } from "../src/lib/seed-data.js";

// AC 1 fixes the demo password to exactly this value; tests assert the spec,
// so the literal is intentional here (production source carries only the hash).
const DEMO_PASSWORD = "demo1234";
import { freshDb } from "./helpers/db.js";

let db: Db;

beforeEach(() => {
  db = freshDb();
});

afterEach(() => {
  db.$client.close();
});

describe("seed: demo accounts (AC 1)", () => {
  it("creates exactly one employee and one manager account", () => {
    seed(db);

    const allUsers = db.select().from(users).all();
    expect(allUsers).toHaveLength(2);

    const employees = allUsers.filter((u) => u.role === "employee");
    const managers = allUsers.filter((u) => u.role === "manager");
    expect(employees).toHaveLength(1);
    expect(managers).toHaveLength(1);
    expect(employees[0]?.email).toBe(EMPLOYEE_EMAIL);
    expect(managers[0]?.email).toBe(MANAGER_EMAIL);
  });

  it("stores a non-plaintext hash that verifies against the demo password", () => {
    seed(db);

    const allUsers = db.select().from(users).all();
    for (const user of allUsers) {
      expect(user.passwordHash).not.toBe(DEMO_PASSWORD);
      expect(verifyPassword(DEMO_PASSWORD, user.passwordHash)).toBe(true);
    }
  });
});

describe("seed: demo expenses (AC 3)", () => {
  it("creates expenses in submitted, approved, and rejected status, all owned by the employee", () => {
    seed(db);

    const allExpenses = db.select().from(expenses).all();
    const byStatus = (status: string) =>
      allExpenses.filter((e) => e.status === status);
    expect(byStatus("submitted")).toHaveLength(2);
    expect(byStatus("approved")).toHaveLength(2);
    expect(byStatus("rejected")).toHaveLength(2);
    expect(allExpenses).toHaveLength(6);

    const employee = db
      .select()
      .from(users)
      .where(eq(users.email, EMPLOYEE_EMAIL))
      .get();
    for (const expense of allExpenses) {
      expect(expense.userId).toBe(employee?.id);
      expect(expense.amountCents).toBeGreaterThan(0);
      expect(expense.description).not.toBe("");
      expect(new Date(expense.expenseDate).getTime()).toBeLessThan(Date.now());
      // EXP-STORY-005: every demo expense carries a real category, not the
      // schema default, so the list view has something meaningful to show.
      expect(expense.category).not.toBe("");
      expect(expense.category).not.toBe("Uncategorized");
    }
  });
});

describe("seed: status history (AC 4)", () => {
  it("records the manager's decision for every decided expense", () => {
    seed(db);

    const manager = db
      .select()
      .from(users)
      .where(eq(users.email, MANAGER_EMAIL))
      .get();
    const allExpenses = db.select().from(expenses).all();
    const allHistory = db.select().from(statusHistory).all();

    const decided = allExpenses.filter((e) => e.status !== "submitted");
    expect(decided.length).toBeGreaterThan(0);

    for (const expense of decided) {
      const rows = allHistory.filter((h) => h.expenseId === expense.id);
      expect(rows).toHaveLength(1);
      const history = rows[0]!;
      expect(history.newStatus).toBe(expense.status);
      expect(history.actorId).toBe(manager?.id);
      expect(history.changedAt > expense.createdAt).toBe(true);
      expect(new Date(`${history.changedAt}Z`).getTime()).toBeLessThan(
        Date.now(),
      );
    }
  });

  it("records no history for submitted expenses", () => {
    seed(db);

    const submitted = db
      .select()
      .from(expenses)
      .where(eq(expenses.status, "submitted"))
      .all();
    const allHistory = db.select().from(statusHistory).all();
    const submittedIds = new Set(submitted.map((e) => e.id));
    expect(allHistory.some((h) => submittedIds.has(h.expenseId))).toBe(false);
  });
});

describe("seed: idempotency (AC 5)", () => {
  it("running the seed twice duplicates nothing and keeps the same rows", () => {
    seed(db);
    const snapshot = () => ({
      userIds: db
        .select({ id: users.id })
        .from(users)
        .all()
        .map((r) => r.id)
        .sort(),
      expenseIds: db
        .select({ id: expenses.id })
        .from(expenses)
        .all()
        .map((r) => r.id)
        .sort(),
      historyIds: db
        .select({ id: statusHistory.id })
        .from(statusHistory)
        .all()
        .map((r) => r.id)
        .sort(),
    });

    const first = snapshot();
    seed(db);
    const second = snapshot();

    expect(second).toEqual(first);
    expect(second.userIds).toHaveLength(2);
    expect(second.expenseIds).toHaveLength(6);
    expect(second.historyIds).toHaveLength(4);
  });
});
