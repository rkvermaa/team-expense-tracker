import { beforeEach, describe, expect, it } from "vitest";

import type { Db } from "../../src/db/client.js";
import { freshDb } from "../helpers/db.js";

interface ColumnInfo {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

function insertUser(db: Db, email: string, role: string) {
  db.$client
    .prepare(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
    )
    .run(email, "hashed-secret", role);
}

describe("users table (AC1)", () => {
  let db: Db;

  beforeEach(() => {
    db = freshDb();
  });

  it("has id (pk), email, password_hash, and role columns, all required", () => {
    const columns = db.$client
      .prepare("PRAGMA table_info(users)")
      .all() as ColumnInfo[];
    const byName = new Map(columns.map((c) => [c.name, c]));

    expect(byName.get("id")?.pk).toBe(1);
    expect(byName.get("email")?.notnull).toBe(1);
    expect(byName.get("password_hash")?.notnull).toBe(1);
    expect(byName.get("role")?.notnull).toBe(1);
  });

  it("accepts the roles 'employee' and 'manager'", () => {
    expect(() => insertUser(db, "emp@example.com", "employee")).not.toThrow();
    expect(() => insertUser(db, "mgr@example.com", "manager")).not.toThrow();
  });

  it("rejects any other role value", () => {
    expect(() => insertUser(db, "acct@example.com", "accountant")).toThrow(
      /CHECK/i,
    );
  });

  it("rejects duplicate emails", () => {
    insertUser(db, "dup@example.com", "employee");
    expect(() => insertUser(db, "dup@example.com", "manager")).toThrow(
      /UNIQUE/i,
    );
  });
});
