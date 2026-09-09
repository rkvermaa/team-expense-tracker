import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PATCH } from "../../src/app/api/expenses/[id]/status/route.js";
import { POST } from "../../src/app/api/expenses/route.js";
import { createDb, type Db } from "../../src/db/client.js";
import { runMigrations } from "../../src/db/migrate.js";
import { SESSION_COOKIE } from "../../src/lib/auth/session.js";
import { mintSessionToken } from "../helpers/jwt.js";

function insertUser(db: Db, email: string, role = "employee"): number {
  const result = db.$client
    .prepare("INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)")
    .run(email, "hashed-secret", role);
  return Number(result.lastInsertRowid);
}

function makeRequest(
  url: string,
  { method, token, body }: { method: string; token: string; body: unknown },
): NextRequest {
  const headers = new Headers({
    "content-type": "application/json",
    cookie: `${SESSION_COOKIE}=${token}`,
  });
  return new NextRequest(url, { method, headers, body: JSON.stringify(body) });
}

describe("expenses API routes", () => {
  let dbPath: string;
  let employeeId: number;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `expenses-route-test-${Date.now()}-${Math.random()}.db`);
    process.env.DATABASE_PATH = dbPath;
    const db = createDb(dbPath);
    runMigrations(db);
    employeeId = insertUser(db, "employee@example.com");
  });

  afterEach(() => {
    delete process.env.DATABASE_PATH;
    fs.rmSync(dbPath, { force: true });
    fs.rmSync(`${dbPath}-journal`, { force: true });
  });

  it("POST /api/expenses returns 400, not a crashed 500, when description is missing", async () => {
    const token = await mintSessionToken({ sub: String(employeeId), role: "employee" });
    const request = makeRequest("http://localhost/api/expenses", {
      method: "POST",
      token,
      body: { amount: "42", expenseDate: "2026-08-01" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("POST /api/expenses returns 400, not a crashed 500, when expenseDate is missing", async () => {
    const token = await mintSessionToken({ sub: String(employeeId), role: "employee" });
    const request = makeRequest("http://localhost/api/expenses", {
      method: "POST",
      token,
      body: { description: "Team lunch", amount: "42" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("PATCH .../status returns 400, not 409, for a status value that doesn't exist", async () => {
    const token = await mintSessionToken({ sub: String(employeeId), role: "employee" });
    const createRequest = makeRequest("http://localhost/api/expenses", {
      method: "POST",
      token,
      body: { description: "Team lunch", amount: "42", expenseDate: "2026-08-01" },
    });
    const created = await POST(createRequest);
    const { expense } = await created.json();

    const request = makeRequest(
      `http://localhost/api/expenses/${expense.id}/status`,
      { method: "PATCH", token, body: { status: "archived" } },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: String(expense.id) }),
    });
    expect(response.status).toBe(400);
  });

  it("PATCH .../status still returns 409 for a legal-status-but-illegal transition", async () => {
    const employeeToken = await mintSessionToken({
      sub: String(employeeId),
      role: "employee",
    });
    const createRequest = makeRequest("http://localhost/api/expenses", {
      method: "POST",
      token: employeeToken,
      body: { description: "Team lunch", amount: "42", expenseDate: "2026-08-01" },
    });
    const created = await POST(createRequest);
    const { expense } = await created.json();

    // A manager may decide "approved", but this expense is still a draft -
    // "submitted" is the only route into "approved", so this is a state
    // conflict (409), not a role or input problem.
    const managerToken = await mintSessionToken({ sub: "999", role: "manager" });
    const request = makeRequest(
      `http://localhost/api/expenses/${expense.id}/status`,
      { method: "PATCH", token: managerToken, body: { status: "approved" } },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: String(expense.id) }),
    });
    expect(response.status).toBe(409);
  });
});
