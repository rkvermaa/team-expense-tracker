import { and, desc, eq } from "drizzle-orm";

import type { Db } from "../../db/client.js";
import { expenses } from "../../db/schema.js";
import type { ExpenseStatus } from "../../db/schema.js";

export type ExpenseListItem = {
  id: number;
  expenseDate: string;
  amountCents: number;
  category: string;
  status: ExpenseStatus;
};

export type ExpenseDetail = ExpenseListItem & {
  description: string;
};

/**
 * Returns the given user's expenses, newest first (by expense date, tie-broken
 * by id so same-day rows have a stable order). The `where` clause is the sole
 * ownership boundary for the list view (AC2): callers pass the id from the
 * verified session, never from client input.
 */
export function listExpensesForUser(
  db: Db,
  userId: number,
): ExpenseListItem[] {
  return db
    .select({
      id: expenses.id,
      expenseDate: expenses.expenseDate,
      amountCents: expenses.amountCents,
      category: expenses.category,
      status: expenses.status,
    })
    .from(expenses)
    .where(eq(expenses.userId, userId))
    .orderBy(desc(expenses.expenseDate), desc(expenses.id))
    .all();
}

/**
 * Returns a single expense by id, but only if it belongs to the given user, or
 * `undefined` otherwise. Matching on both id and owner in the same `where` is
 * the ownership boundary for the detail view (AC3): a request for another
 * employee's record is indistinguishable from one that does not exist, so the
 * caller renders the same not-found response for both.
 */
export function getExpenseForUser(
  db: Db,
  id: number,
  userId: number,
): ExpenseDetail | undefined {
  return db
    .select({
      id: expenses.id,
      expenseDate: expenses.expenseDate,
      amountCents: expenses.amountCents,
      category: expenses.category,
      status: expenses.status,
      description: expenses.description,
    })
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
    .get();
}
