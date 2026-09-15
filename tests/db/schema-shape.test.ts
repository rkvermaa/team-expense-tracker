import { describe, expect, it } from "vitest";

import { freshDb } from "../helpers/db.js";

describe("schema shape (AC5)", () => {
  it("contains exactly the brief's entities plus the migrations journal", () => {
    const db = freshDb();
    const tables = db.$client
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string }[];

    expect(tables.map((t) => t.name)).toEqual([
      "__drizzle_migrations",
      "expenses",
      "notifications",
      "status_history",
      "users",
    ]);
  });
});
