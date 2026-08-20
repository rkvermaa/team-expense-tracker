"use client";

import { useRouter } from "next/navigation";

import type { ExpenseStatus } from "@/db/schema";
import { canDelete } from "@/lib/expenses/status";

export function DeleteExpenseButton({
  expenseId,
  status,
}: {
  expenseId: number;
  status: ExpenseStatus;
}) {
  const router = useRouter();

  if (!canDelete(status)) {
    return null;
  }

  async function handleDelete() {
    if (!window.confirm("Delete this expense? This cannot be undone.")) {
      return;
    }
    await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
    router.refresh();
  }

  return <button onClick={handleDelete}>Delete</button>;
}
