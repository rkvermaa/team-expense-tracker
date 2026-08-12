/**
 * Fixed demo dataset for the seed script. These credentials are a
 * cross-story contract: auth (EXP-STORY-003) logs in with them, and the
 * README documents them.
 */
import type { ExpenseStatus } from "../db/schema.js";

export const DEMO_PASSWORD = "demo1234";
export const EMPLOYEE_EMAIL = "employee@demo.test";
export const MANAGER_EMAIL = "manager@demo.test";

export type SeedExpense = {
  /** Unique within the seed set; used as the idempotency key. */
  description: string;
  amountCents: number;
  status: ExpenseStatus;
  /** How long ago the employee filed it, relative to seed run time. */
  createdDaysAgo: number;
  /** For approved/rejected: days after filing that the manager decided. */
  decisionDaysAfter?: number;
};

export const SEED_EXPENSES: readonly SeedExpense[] = [
  { description: "Client lunch", amountCents: 4250, status: "submitted", createdDaysAgo: 6 },
  { description: "Taxi to airport", amountCents: 2300, status: "submitted", createdDaysAgo: 5 },
  { description: "Conference ticket", amountCents: 29900, status: "approved", createdDaysAgo: 20, decisionDaysAfter: 2 },
  { description: "Hotel - 2 nights", amountCents: 24000, status: "approved", createdDaysAgo: 14, decisionDaysAfter: 3 },
  { description: "Team dinner", amountCents: 18000, status: "rejected", createdDaysAgo: 12, decisionDaysAfter: 1 },
  { description: "Monitor for home office", amountCents: 35000, status: "rejected", createdDaysAgo: 9, decisionDaysAfter: 2 },
];
