import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Db } from "../../src/db/client.js";
import {
  changeStatus,
  createExpense,
  ForbiddenError,
  listExpenses,
  ValidationError,
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

  it("does not drift on amounts that don't round cleanly in binary floating point", () => {
    expect(parseAmountToCents("19.99")).toBe(1999);
    expect(parseAmountToCents("0.10")).toBe(10);
  });

  it("rejects more than two decimal places", () => {
    expect(() => parseAmountToCents("1.005")).toThrow();
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

  it("treats approved and rejected as terminal", () => {
    expect(canTransition("approved", "submitted")).toBe(false);
    expect(canTransition("approved", "draft")).toBe(false);
    expect(canTransition("rejected", "approved")).toBe(false);
    expect(canTransition("rejected", "draft")).toBe(false);
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

    changeStatus(db, employeeId, "employee", expense.id, "submitted");
    changeStatus(db, managerId, "manager", expense.id, "approved");

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

    expect(() =>
      changeStatus(db, managerId, "manager", expense.id, "approved"),
    ).toThrow();
  });

  it("rejects a rejected expense being revived", () => {
    const expense = createExpense(db, employeeId, {
      description: "Team lunch",
      amount: "42",
      expenseDate: "2026-08-01",
    });

    changeStatus(db, employeeId, "employee", expense.id, "submitted");
    changeStatus(db, managerId, "manager", expense.id, "rejected");

    expect(() =>
      changeStatus(db, employeeId, "employee", expense.id, "draft"),
    ).toThrow();
    expect(() =>
      changeStatus(db, managerId, "manager", expense.id, "approved"),
    ).toThrow();
  });

  it("does not let one employee act on another employee's expense", () => {
    const other = insertUser(db, "other@example.com");
    const expense = createExpense(db, employeeId, {
      description: "Team lunch",
      amount: "42",
      expenseDate: "2026-08-01",
    });

    expect(() =>
      changeStatus(db, other, "employee", expense.id, "submitted"),
    ).toThrow(ForbiddenError);
  });

  it("lets a manager act on any employee's expense", () => {
    const expense = createExpense(db, employeeId, {
      description: "Team lunch",
      amount: "42",
      expenseDate: "2026-08-01",
    });

    changeStatus(db, employeeId, "employee", expense.id, "submitted");
    const result = changeStatus(
      db,
      managerId,
      "manager",
      expense.id,
      "approved",
    );
    expect(result.status).toBe("approved");
  });

  it("rejects an expense date in the future", () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    expect(() =>
      createExpense(db, employeeId, {
        description: "Team lunch",
        amount: "42",
        expenseDate: tomorrow,
      }),
    ).toThrow();
  });

  it("rejects a missing description with a ValidationError, not a crash", () => {
    expect(() =>
      createExpense(db, employeeId, {
        description: undefined as unknown as string,
        amount: "42",
        expenseDate: "2026-08-01",
      }),
    ).toThrow(ValidationError);
  });

  it("rejects a missing or malformed expense date with a ValidationError, not a crash", () => {
    expect(() =>
      createExpense(db, employeeId, {
        description: "Team lunch",
        amount: "42",
        expenseDate: undefined as unknown as string,
      }),
    ).toThrow(ValidationError);

    expect(() =>
      createExpense(db, employeeId, {
        description: "Team lunch",
        amount: "42",
        expenseDate: "08/01/2026",
      }),
    ).toThrow(ValidationError);
  });

  it("attaches the filing user's email to each listed expense", () => {
    createExpense(db, employeeId, {
      description: "Team lunch",
      amount: "42",
      expenseDate: "2026-08-01",
    });

    const rows = listExpenses(db, { page: 1 });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.userEmail).toBe("employee@example.com");
  });

  it("treats page as 1-based, not skipping the first page's rows", () => {
    for (let i = 0; i < 3; i++) {
      createExpense(db, employeeId, {
        description: `Expense ${i}`,
        amount: "10",
        expenseDate: "2026-08-01",
      });
    }

    const firstPage = listExpenses(db, { page: 1, limit: 2 });
    const secondPage = listExpenses(db, { page: 2, limit: 2 });

    expect(firstPage).toHaveLength(2);
    expect(secondPage).toHaveLength(1);
  });

  it("scopes the list to one user's expenses when userId is given", () => {
    const other = insertUser(db, "other@example.com");
    createExpense(db, employeeId, {
      description: "Mine",
      amount: "10",
      expenseDate: "2026-08-01",
    });
    createExpense(db, other, {
      description: "Not mine",
      amount: "10",
      expenseDate: "2026-08-01",
    });

    const rows = listExpenses(db, { userId: employeeId });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.userId).toBe(employeeId);
  });

  it("fetches a page in a single query, not one query per row (no N+1)", () => {
    for (let i = 0; i < 5; i++) {
      createExpense(db, employeeId, {
        description: `Expense ${i}`,
        amount: "10",
        expenseDate: "2026-08-01",
      });
    }

    const prepareSpy = vi.spyOn(db.$client, "prepare");
    const rows = listExpenses(db, { limit: 5 });
    expect(rows).toHaveLength(5);
    expect(prepareSpy).toHaveBeenCalledTimes(1);
    prepareSpy.mockRestore();
  });
});
