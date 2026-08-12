import { describe, expect, it } from "vitest";
import { classifyRoute } from "./route-policy";

describe("classifyRoute", () => {
  it.each(["/login", "/_next/static/x.js", "/_next/image", "/favicon.ico"])(
    "classifies %s as public",
    (pathname) => {
      expect(classifyRoute(pathname)).toBe("public");
    },
  );

  it.each(["/", "/dashboard", "/dashboard/settings"])(
    "classifies %s as authenticated",
    (pathname) => {
      expect(classifyRoute(pathname)).toBe("authenticated");
    },
  );

  it.each(["/manager", "/manager/reports", "/manager/anything/nested"])(
    "classifies %s as manager-only",
    (pathname) => {
      expect(classifyRoute(pathname)).toBe("manager");
    },
  );

  it("defaults unknown paths to authenticated so future routes ship guarded", () => {
    expect(classifyRoute("/expenses")).toBe("authenticated");
    expect(classifyRoute("/api/expenses")).toBe("authenticated");
    expect(classifyRoute("/some/future/route")).toBe("authenticated");
  });

  it("does not treat lookalike prefixes as manager routes", () => {
    expect(classifyRoute("/managers")).toBe("authenticated");
    expect(classifyRoute("/loginner")).toBe("authenticated");
  });
});
