/**
 * Fixed demo dataset for the seed script. These credentials are a
 * cross-story contract: auth (EXP-STORY-003) logs in with them, and the
 * README documents them.
 */
import type { ExpenseStatus } from "../db/schema.js";

/**
 * Precomputed bcrypt hash (cost 10) of the demo password documented in the
 * README. Only the hash is committed in production source; the plaintext
 * lives in the README (for developers) and in tests (to verify login works).
 */
export const DEMO_PASSWORD_BCRYPT_HASH =
  "$2b$10$xlhSEjZwYe0JFLQ8kb1iqeMYkgJqoP/trC.J2q17H7qZBZEjWM1tG";
export const EMPLOYEE_EMAIL = "employee@demo.test";
export const MANAGER_EMAIL = "manager@demo.test";

export type SeedExpense = {
  /** Unique within the seed set; used as the idempotency key. */
  description: string;
  amountCents: number;
  /** Free-text category displayed by the list view (EXP-STORY-005). */
  category: string;
  status: ExpenseStatus;
  /** How long ago the employee filed it, relative to seed run time. */
  createdDaysAgo: number;
  /** For approved/rejected: days after filing that the manager decided. */
  decisionDaysAfter?: number;
};

export const SEED_EXPENSES: readonly SeedExpense[] = [
  { description: "Client lunch", amountCents: 4250, category: "Meals", status: "submitted", createdDaysAgo: 6 },
  { description: "Taxi to airport", amountCents: 2300, category: "Travel", status: "submitted", createdDaysAgo: 5 },
  { description: "Conference ticket", amountCents: 29900, category: "Education", status: "approved", createdDaysAgo: 20, decisionDaysAfter: 2 },
  { description: "Hotel - 2 nights", amountCents: 24000, category: "Lodging", status: "approved", createdDaysAgo: 14, decisionDaysAfter: 3 },
  { description: "Team dinner", amountCents: 18000, category: "Meals", status: "rejected", createdDaysAgo: 12, decisionDaysAfter: 1 },
  { description: "Monitor for home office", amountCents: 35000, category: "Equipment", status: "rejected", createdDaysAgo: 9, decisionDaysAfter: 2 },
];
