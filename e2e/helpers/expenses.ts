import { eq } from "drizzle-orm";

import { E2E_APP_DB_PATH } from "../../playwright.config";
import { createDb, type Db } from "../../src/db/client";
import { expenses, statusHistory, users, type ExpenseStatus } from "../../src/db/schema";

let db: Db | undefined;

function getDb(): Db {
  db ??= createDb(E2E_APP_DB_PATH);
  return db;
}

export async function insertUser(email: string, role: "employee" | "manager" = "employee"): Promise<number> {
  const row = getDb()
    .insert(users)
    .values({ email, passwordHash: "not-used-in-this-spec", role })
    .returning({ id: users.id })
    .get();
  return row.id;
}

export async function insertExpense(fields: {
  userId: number;
  description: string;
  status: ExpenseStatus;
  amountCents?: number;
}): Promise<number> {
  const row = getDb()
    .insert(expenses)
    .values({
      userId: fields.userId,
      amountCents: fields.amountCents ?? 1000,
      description: fields.description,
      expenseDate: "2026-08-01",
      status: fields.status,
    })
    .returning({ id: expenses.id })
    .get();
  return row.id;
}

export async function expenseExists(expenseId: number): Promise<boolean> {
  const row = getDb().select().from(expenses).where(eq(expenses.id, expenseId)).get();
  return row !== undefined;
}

/** Clears all expense/user rows between tests so specs don't see each other's fixtures. */
export async function resetExpenseData(): Promise<void> {
  const database = getDb();
  database.delete(statusHistory).run();
  database.delete(expenses).run();
  database.delete(users).run();
}
