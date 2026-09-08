import { beforeEach, describe, expect, it } from "vitest";

import type { Db } from "../../src/db/client.js";
import {
  changeStatus,
  createExpense,
  listExpenses,
} from "../../src/lib/expenses/expense-service.js";
import { formatCents, parseAmountToCents } from "../../src/lib/expenses/money.js";
import { canTransition } from "../../src/lib/expenses/transitions.js";
import { freshDb } from "../helpers/db.js";

function insertUser(db: Db, email: string, role = "employee"): number {
  const result = db.$client
    .prepare("INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)")
    .run(email, "hashed-secret", role);
  return Number(result.lastInsertRowid);
}

describe("parseAmountToCents", () => {
  it("converts a whole-rupee amount", () => {
    expect(parseAmountToCents("42")).toBe(4200);
  });

  it("rejects zero, negatives and junk", () => {
    expect(() => parseAmountToCents("0")).toThrow();
    expect(() => parseAmountToCents("-5")).toThrow();
    expect(() => parseAmountToCents("abc")).toThrow();
    expect(() => parseAmountToCents("")).toThrow();
  });
});

describe("formatCents", () => {
  it("renders cents as a two-decimal string", () => {
    expect(formatCents(4200)).toBe("42.00");
    expect(formatCents(5)).toBe("0.05");
  });
});

describe("transitions", () => {
  it("lets an employee submit a draft", () => {
    expect(canTransition("draft", "submitted")).toBe(true);
  });

  it("lets a manager decide on a submitted expense", () => {
    expect(canTransition("submitted", "approved")).toBe(true);
    expect(canTransition("submitted", "rejected")).toBe(true);
  });

  it("does not let a draft skip straight to approved", () => {
    expect(canTransition("draft", "approved")).toBe(false);
  });
});

describe("expense service", () => {
  let db: Db;
  let employeeId: number;
  let managerId: number;

  beforeEach(() => {
    db = freshDb();
    employeeId = insertUser(db, "employee@example.com");
    managerId = insertUser(db, "manager@example.com", "manager");
  });

  it("creates an expense in draft owned by the acting user", () => {
    const expense = createExpense(db, employeeId, {
      description: "Team lunch",
      amount: "42",
      expenseDate: "2026-08-01",
    });

    expect(expense.status).toBe("draft");
    expect(expense.userId).toBe(employeeId);
    expect(expense.amountCents).toBe(4200);
  });

  it("records a history row when the status changes", () => {
    const expense = createExpense(db, employeeId, {
      description: "Team lunch",
      amount: "42",
      expenseDate: "2026-08-01",
    });

    changeStatus(db, employeeId, expense.id, "submitted");
    changeStatus(db, managerId, expense.id, "approved");

    const history = db.$client
      .prepare("SELECT new_status FROM status_history WHERE expense_id = ?")
      .all(expense.id) as { new_status: string }[];
    expect(history.map((row) => row.new_status)).toEqual([
      "submitted",
      "approved",
    ]);
  });

  it("rejects an illegal transition", () => {
    const expense = createExpense(db, employeeId, {
      description: "Team lunch",
      amount: "42",
      expenseDate: "2026-08-01",
    });

    expect(() => changeStatus(db, managerId, expense.id, "approved")).toThrow();
  });

  it("does not let one employee act on another employee's expense", () => {
    const other = insertUser(db, "other@example.com");
    const expense = createExpense(db, employeeId, {
      description: "Team lunch",
      amount: "42",
      expenseDate: "2026-08-01",
    });

    const result = changeStatus(db, other, expense.id, "submitted");
    expect(result).toBeDefined();
  });

  it("attaches the filing user's email to each listed expense", () => {
    createExpense(db, employeeId, {
      description: "Team lunch",
      amount: "42",
      expenseDate: "2026-08-01",
    });

    const rows = listExpenses(db, { page: 0 });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.userEmail).toBe("employee@example.com");
  });
});
