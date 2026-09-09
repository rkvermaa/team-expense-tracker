import { NextRequest, NextResponse } from "next/server";

import { createDb } from "@/db/client";
import { EXPENSE_STATUSES, type ExpenseStatus } from "@/db/schema";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import {
  changeStatus,
  ExpenseNotFoundError,
  ForbiddenError,
} from "@/lib/expenses/expense-service";
import { InvalidTransitionError } from "@/lib/expenses/transitions";

function db() {
  return createDb(process.env.DATABASE_PATH ?? "expenses.db");
}

/** Decisions a manager makes; employees may only submit or withdraw. */
const MANAGER_ONLY: ExpenseStatus[] = ["approved", "rejected"];

/**
 * PATCH /api/expenses/:id/status - move an expense through the lifecycle.
 *
 * Body: `{ "status": "submitted" | "approved" | "rejected" | "draft" }`
 *
 * The acting role always comes from the verified session, never from the
 * request body - otherwise any caller could self-declare "manager" and
 * approve their own expense.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();

  if (!EXPENSE_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: `"${body.status}" is not a valid expense status` },
      { status: 400 },
    );
  }
  const next: ExpenseStatus = body.status;

  if (MANAGER_ONLY.includes(next) && session.role !== "manager") {
    return NextResponse.json(
      { error: "Only a manager can approve or reject an expense" },
      { status: 403 },
    );
  }

  try {
    const expense = changeStatus(
      db(),
      Number(session.sub),
      session.role,
      Number(id),
      next,
    );
    return NextResponse.json({ expense });
  } catch (error) {
    if (error instanceof ExpenseNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof InvalidTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
