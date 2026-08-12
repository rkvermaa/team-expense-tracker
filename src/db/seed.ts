import { and, eq } from "drizzle-orm";

import {
  DEMO_PASSWORD_BCRYPT_HASH,
  EMPLOYEE_EMAIL,
  MANAGER_EMAIL,
  SEED_EXPENSES,
} from "../lib/seed-data.js";
import type { Db } from "./client.js";
import { expenses, statusHistory, users, type UserRole } from "./schema.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Formats a Date the way SQLite's CURRENT_TIMESTAMP does: "YYYY-MM-DD HH:MM:SS" (UTC). */
function toSqliteTimestamp(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 19);
}

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

function upsertUser(tx: Tx, email: string, role: UserRole): number {
  const existing = tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .get();
  if (existing) {
    return existing.id;
  }
  const inserted = tx
    .insert(users)
    .values({ email, passwordHash: DEMO_PASSWORD_BCRYPT_HASH, role })
    .returning({ id: users.id })
    .get();
  return inserted.id;
}

function upsertExpenses(
  tx: Tx,
  employeeId: number,
  managerId: number,
  now: Date,
): void {
  for (const seedExpense of SEED_EXPENSES) {
    const existing = tx
      .select({ id: expenses.id })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, employeeId),
          eq(expenses.description, seedExpense.description),
        ),
      )
      .get();
    if (existing) {
      continue;
    }

    const filedAt = daysAgo(now, seedExpense.createdDaysAgo);
    const decidedAt =
      seedExpense.decisionDaysAfter === undefined
        ? filedAt
        : new Date(filedAt.getTime() + seedExpense.decisionDaysAfter * DAY_MS);
    const inserted = tx
      .insert(expenses)
      .values({
        userId: employeeId,
        amountCents: seedExpense.amountCents,
        description: seedExpense.description,
        expenseDate: toSqliteTimestamp(filedAt).slice(0, 10),
        status: seedExpense.status,
        createdAt: toSqliteTimestamp(filedAt),
        updatedAt: toSqliteTimestamp(decidedAt),
      })
      .returning({ id: expenses.id })
      .get();

    if (seedExpense.status !== "submitted") {
      tx.insert(statusHistory)
        .values({
          expenseId: inserted.id,
          newStatus: seedExpense.status,
          actorId: managerId,
          changedAt: toSqliteTimestamp(decidedAt),
        })
        .run();
    }
  }
}

/**
 * Populates the database with the fixed demo dataset. Idempotent: rows are
 * matched by their natural keys (users by email, expenses by owner +
 * description), so running twice creates nothing new and never touches
 * records a developer created by hand.
 */
export function seed(db: Db): void {
  const now = new Date();
  db.transaction((tx) => {
    const employeeId = upsertUser(tx, EMPLOYEE_EMAIL, "employee");
    const managerId = upsertUser(tx, MANAGER_EMAIL, "manager");
    upsertExpenses(tx, employeeId, managerId, now);
  });
}
