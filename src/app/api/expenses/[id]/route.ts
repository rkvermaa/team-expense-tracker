import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { deleteExpense } from "@/lib/expenses/delete";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const expenseId = Number(id);
  if (!Number.isInteger(expenseId)) {
    return NextResponse.json({ error: "Invalid expense id" }, { status: 400 });
  }

  const result = deleteExpense(db, { expenseId, userId: Number(session.sub) });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
