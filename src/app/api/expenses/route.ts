import { NextRequest, NextResponse } from "next/server";

import { createDb } from "@/db/client";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import {
  createExpense,
  listExpenses,
  type ListOptions,
} from "@/lib/expenses/expense-service";
import { InvalidAmountError } from "@/lib/expenses/money";

function db() {
  return createDb(process.env.DATABASE_PATH ?? "expenses.db");
}

/**
 * GET /api/expenses - the expense list.
 *
 * Authentication is already enforced by middleware.ts; we re-read the session
 * here to know *who* is asking. Employees only ever see their own expenses;
 * managers see every expense so they can work the approval queue.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const options: ListOptions = {
    page: Number(params.get("page") ?? "1"),
    limit: Number(params.get("limit") ?? "20"),
    sort: params.get("sort") ?? undefined,
    dir: params.get("dir") === "asc" ? "asc" : "desc",
    userId: session.role === "manager" ? undefined : Number(session.sub),
  };

  return NextResponse.json({ expenses: listExpenses(db(), options) });
}

/** POST /api/expenses - file a new expense in `draft`. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  try {
    const expense = createExpense(db(), Number(session.sub), {
      description: body.description,
      amount: String(body.amount),
      expenseDate: body.expenseDate,
    });
    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidAmountError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
