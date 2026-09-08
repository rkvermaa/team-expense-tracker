import { eq, sql } from "drizzle-orm";

import type { Db } from "@/db/client";
import {
  expenses,
  statusHistory,
  users,
  type ExpenseStatus,
} from "@/db/schema";

import { parseAmountToCents } from "./money";
import { assertTransition } from "./transitions";

export class ExpenseNotFoundError extends Error {
  constructor(id: number) {
    super(`Expense ${id} does not exist`);
    this.name = "ExpenseNotFoundError";
  }
}

export interface ExpenseRow {
  id: number;
  userId: number;
  amountCents: number;
  description: string;
  expenseDate: string;
  status: ExpenseStatus;
}

export interface ExpenseView extends ExpenseRow {
  /** Denormalised for the list UI, which shows who filed each expense. */
  userEmail: string;
}

export interface CreateExpenseInput {
  description: string;
  /** Human-entered decimal string, e.g. "42.50". */
  amount: string;
  /** ISO-8601 calendar date, e.g. "2026-08-01". */
  expenseDate: string;
}

export interface ListOptions {
  /** 1-based page number as it appears in the query string. */
  page?: number;
  limit?: number;
  /** Column to order by; one of the sortable columns below. */
  sort?: string;
  dir?: "asc" | "desc";
}

const SORTABLE_COLUMNS = [
  "expense_date",
  "amount_cents",
  "status",
  "created_at",
];

const DEFAULT_LIMIT = 20;

/** Create a new expense in `draft` for the acting user. */
export function createExpense(
  db: Db,
  actorId: number,
  input: CreateExpenseInput,
): ExpenseRow {
  const description = input.description.trim();
  if (description.length === 0) {
    throw new Error("Description is required");
  }
  const amountCents = parseAmountToCents(input.amount);

  const [row] = db
    .insert(expenses)
    .values({
      userId: actorId,
      amountCents,
      description,
      expenseDate: input.expenseDate,
      status: "draft",
    })
    .returning()
    .all();

  return row as ExpenseRow;
}

function loadExpense(db: Db, expenseId: number): ExpenseRow {
  const row = db
    .select()
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .get();
  if (!row) {
    throw new ExpenseNotFoundError(expenseId);
  }
  return row as ExpenseRow;
}

/**
 * Move an expense to a new status and record who did it. The transition graph
 * in transitions.ts decides what is legal; this function only performs it.
 */
export function changeStatus(
  db: Db,
  actorId: number,
  expenseId: number,
  next: ExpenseStatus,
): ExpenseRow {
  const current = loadExpense(db, expenseId);
  assertTransition(current.status, next);

  db.update(expenses)
    .set({ status: next, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(expenses.id, expenseId))
    .run();

  db.insert(statusHistory)
    .values({ expenseId, newStatus: next, actorId })
    .run();

  return { ...current, status: next };
}

/** Update the editable fields of an expense that is still a draft. */
export function updateExpense(
  db: Db,
  actorId: number,
  expenseId: number,
  input: Partial<CreateExpenseInput>,
): ExpenseRow {
  const current = loadExpense(db, expenseId);
  if (current.status !== "draft") {
    throw new Error("Only draft expenses can be edited");
  }

  const patch: Partial<ExpenseRow> = {};
  if (input.description !== undefined) {
    patch.description = input.description.trim();
  }
  if (input.amount !== undefined) {
    patch.amountCents = parseAmountToCents(input.amount);
  }
  if (input.expenseDate !== undefined) {
    patch.expenseDate = input.expenseDate;
  }

  db.update(expenses)
    .set({ ...patch, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(expenses.id, expenseId))
    .run();

  return { ...current, ...patch };
}

/**
 * Page through expenses, newest first by default, with the filing user's email
 * attached for the list UI.
 */
export function listExpenses(db: Db, options: ListOptions = {}): ExpenseView[] {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const page = options.page ?? 1;
  const offset = page * limit;

  const sortColumn = SORTABLE_COLUMNS.includes(options.sort ?? "")
    ? options.sort
    : "created_at";
  const dir = options.dir === "asc" ? "asc" : "desc";

  const rows = db
    .select()
    .from(expenses)
    .orderBy(sql.raw(`${sortColumn} ${dir}`))
    .limit(limit)
    .offset(offset)
    .all() as ExpenseRow[];

  return rows.map((row) => {
    const owner = db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, row.userId))
      .get();
    return { ...row, userEmail: owner?.email ?? "" };
  });
}
