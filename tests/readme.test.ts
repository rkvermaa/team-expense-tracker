import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { EMPLOYEE_EMAIL, MANAGER_EMAIL } from "../src/lib/seed-data.js";

const DEMO_PASSWORD = "demo1234";

const readmePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../README.md",
);

describe("README demo account docs (AC 2)", () => {
  it("documents the seed credentials and the seed command", () => {
    const readme = readFileSync(readmePath, "utf8");
    expect(readme).toContain(EMPLOYEE_EMAIL);
    expect(readme).toContain(MANAGER_EMAIL);
    expect(readme).toContain(DEMO_PASSWORD);
    expect(readme).toContain("db:seed");
  });
});
