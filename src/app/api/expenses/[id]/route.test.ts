import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { mintSessionToken } from "../../../../../tests/helpers/jwt";
import { SESSION_COOKIE } from "@/lib/auth/session";

const deleteExpenseMock = vi.fn();
vi.mock("@/lib/expenses/delete", () => ({
  deleteExpense: (...args: unknown[]) => deleteExpenseMock(...args),
}));
vi.mock("@/db", () => ({ db: {} }));

const { DELETE } = await import("./route");

const BASE_URL = "http://localhost:3004";

function makeRequest(pathname: string, token?: string): NextRequest {
  const headers = new Headers();
  if (token) {
    headers.set("cookie", `${SESSION_COOKIE}=${token}`);
  }
  return new NextRequest(`${BASE_URL}${pathname}`, {
    method: "DELETE",
    headers,
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("DELETE /api/expenses/[id]", () => {
  it("returns 401 JSON when there is no session", async () => {
    const response = await DELETE(makeRequest("/api/expenses/1"), makeParams("1"));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeTruthy();
    expect(deleteExpenseMock).not.toHaveBeenCalled();
  });

  it("returns 400 JSON for a non-integer id", async () => {
    const token = await mintSessionToken({ sub: "1" });
    const response = await DELETE(
      makeRequest("/api/expenses/not-a-number", token),
      makeParams("not-a-number"),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeTruthy();
    expect(deleteExpenseMock).not.toHaveBeenCalled();
  });

  it("AC3: maps a 409 from deleteExpense to a JSON error response", async () => {
    deleteExpenseMock.mockReturnValueOnce({
      ok: false,
      status: 409,
      error: "Only draft or rejected expenses can be deleted",
    });
    const token = await mintSessionToken({ sub: "1" });

    const response = await DELETE(makeRequest("/api/expenses/42", token), makeParams("42"));

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Only draft or rejected expenses can be deleted");
    expect(deleteExpenseMock).toHaveBeenCalledWith(
      expect.anything(),
      { expenseId: 42, userId: 1 },
    );
  });

  it("returns 200 when deleteExpense succeeds", async () => {
    deleteExpenseMock.mockReturnValueOnce({ ok: true });
    const token = await mintSessionToken({ sub: "1" });

    const response = await DELETE(makeRequest("/api/expenses/42", token), makeParams("42"));

    expect(response.status).toBe(200);
  });
});
