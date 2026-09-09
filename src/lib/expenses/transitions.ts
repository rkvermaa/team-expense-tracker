import type { ExpenseStatus } from "@/db/schema";

/**
 * Single source of truth for the expense lifecycle. Keeping the graph here
 * rather than scattered across route handlers means a new status only has to be
 * added in one place, and the API layer never has to know the rules.
 *
 *   draft     -> submitted        (employee submits for review)
 *   submitted -> approved | rejected  (manager decides)
 *   submitted -> draft            (employee withdraws while still pending)
 *
 * `approved` and `rejected` are terminal: `submitted` is the only route into
 * `approved`, and once rejected an expense cannot be revived.
 */
const ALLOWED: Record<ExpenseStatus, readonly ExpenseStatus[]> = {
  draft: ["submitted"],
  submitted: ["approved", "rejected", "draft"],
  approved: [],
  rejected: [],
};

export function canTransition(
  from: ExpenseStatus,
  to: ExpenseStatus,
): boolean {
  return ALLOWED[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(from: ExpenseStatus, to: ExpenseStatus) {
    super(`Cannot move an expense from "${from}" to "${to}"`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(
  from: ExpenseStatus,
  to: ExpenseStatus,
): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}
