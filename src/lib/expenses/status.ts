import type { ExpenseStatus } from "@/db/schema";

/** An expense can only be deleted while it hasn't entered the approval flow. */
export function canDelete(status: ExpenseStatus): boolean {
  return status === "draft" || status === "rejected";
}
