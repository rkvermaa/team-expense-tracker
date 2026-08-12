import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const USER_ROLES = ["employee", "manager"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const EXPENSE_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").$type<UserRole>().notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check("users_role_check", sql`${table.role} IN ('employee', 'manager')`),
  ],
);

export const expenses = sqliteTable(
  "expenses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    amountCents: integer("amount_cents").notNull(),
    description: text("description").notNull(),
    expenseDate: text("expense_date").notNull(),
    status: text("status").$type<ExpenseStatus>().notNull().default("draft"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check("expenses_amount_check", sql`${table.amountCents} > 0`),
    check(
      "expenses_status_check",
      sql`${table.status} IN ('draft', 'submitted', 'approved', 'rejected')`,
    ),
  ],
);

export const statusHistory = sqliteTable(
  "status_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    expenseId: integer("expense_id")
      .notNull()
      .references(() => expenses.id),
    newStatus: text("new_status").$type<ExpenseStatus>().notNull(),
    actorId: integer("actor_id")
      .notNull()
      .references(() => users.id),
    changedAt: text("changed_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    check(
      "status_history_status_check",
      sql`${table.newStatus} IN ('draft', 'submitted', 'approved', 'rejected')`,
    ),
  ],
);
