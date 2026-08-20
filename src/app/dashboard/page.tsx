import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import Link from "next/link";

import { db } from "@/db";
import { expenses } from "@/db/schema";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { DeleteExpenseButton } from "./DeleteExpenseButton";

function formatAmount(amountCents: number): string {
  return (amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

// Auth is already enforced by middleware.ts for this route, so the session
// is trusted to exist here.
export default async function DashboardPage() {
  const session = await verifySession(
    (await cookies()).get(SESSION_COOKIE)?.value,
  );
  const userId = Number(session!.sub);

  const myExpenses = db
    .select()
    .from(expenses)
    .where(eq(expenses.userId, userId))
    .all();

  return (
    <main>
      <h1>Dashboard</h1>
      <nav>
        <Link href="/manager">Manager area</Link>
      </nav>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {myExpenses.map((expense) => (
            <tr key={expense.id}>
              <td>{expense.description}</td>
              <td>{formatAmount(expense.amountCents)}</td>
              <td>{expense.expenseDate}</td>
              <td>{expense.status}</td>
              <td>
                <DeleteExpenseButton expenseId={expense.id} status={expense.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
