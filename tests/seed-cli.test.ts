import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { createDb } from "../src/db/client.js";
import { users } from "../src/db/schema.js";
import { verifyPassword } from "../src/lib/password.js";
import {
  DEMO_PASSWORD,
  EMPLOYEE_EMAIL,
  MANAGER_EMAIL,
} from "../src/lib/seed-data.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

let tempDir: string;

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("npm run db:seed (AC 6)", () => {
  it("migrates and seeds a fresh database in one command, ready to log in", () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "seed-cli-"));
    const dbPath = path.join(tempDir, "expense-tracker.db");

    execFileSync("npm", ["run", "db:seed"], {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_PATH: dbPath },
      stdio: "pipe",
    });

    const db = createDb(dbPath);
    try {
      const allUsers = db.select().from(users).all();
      const emails = allUsers.map((u) => u.email).sort();
      expect(emails).toEqual([EMPLOYEE_EMAIL, MANAGER_EMAIL].sort());
      for (const user of allUsers) {
        expect(verifyPassword(DEMO_PASSWORD, user.passwordHash)).toBe(true);
      }
    } finally {
      db.$client.close();
    }
  }, 60_000);
});
