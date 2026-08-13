import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/current-session";
import { getDb } from "@/lib/db";
import { listExpensesForUser } from "@/lib/expenses/queries";
import { formatUsd } from "@/lib/expenses/format";

// better-sqlite3 is a native module, so this route must run on Node.js.
export const runtime = "nodejs";

export default async function ExpensesPage() {
  const session = await getCurrentSession();
  if (!session) {
    // Mirrors the middleware contract; also covers direct rendering paths.
    redirect("/login");
  }

  const expenses = listExpensesForUser(getDb(), Number(session.sub));

  return (
    <main>
      <h1>Expenses</h1>
      {expenses.length === 0 ? (
        <p className="expenses-empty">You haven&apos;t added any expenses yet.</p>
      ) : (
        <ul className="expense-list">
          {expenses.map((expense) => (
            <li key={expense.id}>
              <Link className="expense-row" href={`/expenses/${expense.id}`}>
                <time className="expense-date" dateTime={expense.expenseDate}>
                  <span className="visually-hidden">Date: </span>
                  {expense.expenseDate}
                </time>
                <span className="expense-amount">
                  <span className="visually-hidden">Amount: </span>
                  {formatUsd(expense.amountCents)}
                </span>
                <span className="expense-category">
                  <span className="visually-hidden">Category: </span>
                  {expense.category}
                </span>
                <span
                  className={`expense-status expense-status--${expense.status}`}
                >
                  <span className="visually-hidden">Status: </span>
                  {expense.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
