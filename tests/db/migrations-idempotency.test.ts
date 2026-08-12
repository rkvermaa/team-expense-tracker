import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDb, type Db } from "../../src/db/client.js";
import { runMigrations } from "../../src/db/migrate.js";

function schemaDump(db: Db): string {
  const rows = db.$client
    .prepare(
      "SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name",
    )
    .all();
  return JSON.stringify(rows);
}

describe("migrations (AC4)", () => {
  let dir: string;
  let db: Db;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "expense-tracker-test-"));
    db = createDb(path.join(dir, "fresh.db"));
  });

  afterEach(() => {
    db.$client.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("runs without errors on a fresh database", () => {
    expect(() => runMigrations(db)).not.toThrow();
  });

  it("is idempotent: a second run changes nothing and preserves data", () => {
    runMigrations(db);
    db.$client
      .prepare(
        "INSERT INTO users (email, password_hash, role) VALUES ('kept@example.com', 'hashed-secret', 'manager')",
      )
      .run();
    const before = schemaDump(db);

    expect(() => runMigrations(db)).not.toThrow();

    expect(schemaDump(db)).toBe(before);
    const user = db.$client
      .prepare("SELECT email FROM users WHERE email = 'kept@example.com'")
      .get() as { email: string };
    expect(user.email).toBe("kept@example.com");
  });
});
