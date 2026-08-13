import { desc, eq } from "drizzle-orm";

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
