import { eq } from "drizzle-orm";

import type { Db } from "@/db/client";
import { expenses, statusHistory } from "@/db/schema";
import { canDelete } from "./status";

export type DeleteExpenseResult =
  | { ok: true }
  | { ok: false; status: 404 | 409; error: string };

/**
 * Deletes an expense the caller owns, provided it hasn't left the draft/
 * rejected states. status_history rows are deleted first: they reference
 * expenses.id with no cascade configured, so a rejected expense (which
 * always has a history row) would otherwise fail the FK constraint.
 */
export function deleteExpense(
  db: Db,
  { expenseId, userId }: { expenseId: number; userId: number },
): DeleteExpenseResult {
  const expense = db
    .select({ id: expenses.id, userId: expenses.userId, status: expenses.status })
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .get();

  if (!expense || expense.userId !== userId) {
    return { ok: false, status: 404, error: "Expense not found" };
  }

  if (!canDelete(expense.status)) {
    return {
      ok: false,
      status: 409,
      error: "Only draft or rejected expenses can be deleted",
    };
  }

  db.transaction((tx) => {
    tx.delete(statusHistory).where(eq(statusHistory.expenseId, expenseId)).run();
    tx.delete(expenses).where(eq(expenses.id, expenseId)).run();
  });

  return { ok: true };
}
