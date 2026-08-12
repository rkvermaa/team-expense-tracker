import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { mintSessionToken, tamperToken } from "../tests/helpers/jwt";
import { middleware } from "./middleware";
import { SESSION_COOKIE } from "./lib/auth/session";

const BASE_URL = "http://localhost:3004";

function makeRequest(pathname: string, token?: string): NextRequest {
  const headers = new Headers();
  if (token) {
    headers.set("cookie", `${SESSION_COOKIE}=${token}`);
  }
  return new NextRequest(`${BASE_URL}${pathname}`, { headers });
}

function expectRedirect(response: Response, pathname: string) {
  expect(response.status).toBe(307);
  expect(new URL(response.headers.get("location")!).pathname).toBe(pathname);
}

function expectPassThrough(response: Response) {
  expect(response.status).toBe(200);
  expect(response.headers.get("location")).toBeNull();
}

describe("middleware", () => {
  it("AC1: redirects an unauthenticated request to /dashboard to /login", async () => {
    const response = await middleware(makeRequest("/dashboard"));
    expectRedirect(response, "/login");
  });

  it("AC1: redirects an unauthenticated request to /manager to /login", async () => {
    const response = await middleware(makeRequest("/manager"));
    expectRedirect(response, "/login");
  });

  it("AC1/AC4: treats a tampered session cookie as unauthenticated", async () => {
    const spoofed = tamperToken(await mintSessionToken({ role: "employee" }), {
      role: "manager",
    });
    const response = await middleware(makeRequest("/manager", spoofed));
    expectRedirect(response, "/login");
  });

  it("AC2: redirects an authenticated employee on /manager to /dashboard", async () => {
    const token = await mintSessionToken({ role: "employee" });
    const response = await middleware(makeRequest("/manager", token));
    expectRedirect(response, "/dashboard");
  });

  it("AC2: redirects an employee on a nested manager route to /dashboard", async () => {
    const token = await mintSessionToken({ role: "employee" });
    const response = await middleware(makeRequest("/manager/reports", token));
    expectRedirect(response, "/dashboard");
  });

  it("AC3: lets an authenticated manager through to /manager", async () => {
    const token = await mintSessionToken({ role: "manager" });
    const response = await middleware(makeRequest("/manager", token));
    expectPassThrough(response);
  });

  it("returns 401 JSON instead of a redirect for an unauthenticated API request", async () => {
    const response = await middleware(makeRequest("/api/expenses"));
    expect(response.status).toBe(401);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("returns 401 for an API request with a tampered session cookie", async () => {
    const spoofed = tamperToken(await mintSessionToken({ role: "employee" }), {
      role: "manager",
    });
    const response = await middleware(makeRequest("/api/expenses", spoofed));
    expect(response.status).toBe(401);
  });

  it("lets an authenticated employee through to an API route", async () => {
    const token = await mintSessionToken({ role: "employee" });
    const response = await middleware(makeRequest("/api/expenses", token));
    expectPassThrough(response);
  });

  it("lets an unauthenticated request through to the public /login route", async () => {
    const response = await middleware(makeRequest("/login"));
    expectPassThrough(response);
  });

  it("lets an authenticated employee through to /dashboard", async () => {
    const token = await mintSessionToken({ role: "employee" });
    const response = await middleware(makeRequest("/dashboard", token));
    expectPassThrough(response);
  });
});
