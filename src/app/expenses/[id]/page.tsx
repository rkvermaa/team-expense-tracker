import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/current-session";
import { getDb } from "@/lib/db";
import { getExpenseForUser } from "@/lib/expenses/queries";
import { formatUsd } from "@/lib/expenses/format";

// better-sqlite3 is a native module, so this route must run on Node.js.
export const runtime = "nodejs";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) {
    // Mirrors the middleware contract; also covers direct rendering paths.
    redirect("/login");
  }

  const { id } = await params;
  const expenseId = Number(id);
  // A non-numeric or non-owned id is indistinguishable from a missing record:
  // both render not-found, so one employee cannot probe another's expenses.
  if (!Number.isInteger(expenseId)) {
    notFound();
  }

  const expense = getExpenseForUser(getDb(), expenseId, Number(session.sub));
  if (!expense) {
    notFound();
  }

  return (
    <main>
      <h1>Expense detail</h1>
      <dl className="expense-detail">
        <dt>Description</dt>
        <dd>{expense.description}</dd>

        <dt>Date</dt>
        <dd>
          <time dateTime={expense.expenseDate}>{expense.expenseDate}</time>
        </dd>

        <dt>Amount</dt>
        <dd>{formatUsd(expense.amountCents)}</dd>

        <dt>Category</dt>
        <dd>{expense.category}</dd>

        <dt>Status</dt>
        <dd>
          <span className={`expense-status expense-status--${expense.status}`}>
            {expense.status}
          </span>
        </dd>
      </dl>
      <p>
        <Link href="/expenses">Back to expenses</Link>
      </p>
    </main>
  );
}
