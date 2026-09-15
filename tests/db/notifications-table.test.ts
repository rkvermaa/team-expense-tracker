import { beforeEach, describe, expect, it } from "vitest";

import type { Db } from "../../src/db/client.js";
import { freshDb } from "../helpers/db.js";

interface ColumnInfo {
  name: string;
  notnull: number;
}

function insertUser(db: Db, email: string): number {
  const result = db.$client
    .prepare(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'employee')",
    )
    .run(email, "hashed-secret");
  return Number(result.lastInsertRowid);
}

function insertNotification(
  db: Db,
  userId: number,
  type: string,
  channels: string,
) {
  return db.$client
    .prepare(
      "INSERT INTO notifications (user_id, type, channels) VALUES (?, ?, ?)",
    )
    .run(userId, type, channels);
}

describe("notifications table", () => {
  let db: Db;
  let userId: number;

  beforeEach(() => {
    db = freshDb();
    userId = insertUser(db, "tenant@example.com");
  });

  it("requires user, type, channels, and sent-at columns", () => {
    const columns = db.$client
      .prepare("PRAGMA table_info(notifications)")
      .all() as ColumnInfo[];
    const byName = new Map(columns.map((c) => [c.name, c]));

    for (const col of ["user_id", "type", "channels", "sent_at"]) {
      expect(byName.get(col)?.notnull, `${col} should be NOT NULL`).toBe(1);
    }
  });

  it("records a notification with an auto-populated timestamp", () => {
    const result = insertNotification(db, userId, "due", "email");
    const row = db.$client
      .prepare(
        "SELECT user_id, type, channels, sent_at FROM notifications WHERE id = ?",
      )
      .get(result.lastInsertRowid) as {
      user_id: number;
      type: string;
      channels: string;
      sent_at: string;
    };

    expect(row.user_id).toBe(userId);
    expect(row.type).toBe("due");
    expect(row.channels).toBe("email");
    expect(Number.isNaN(Date.parse(row.sent_at))).toBe(false);
  });

  it("rejects a notification for a nonexistent user", () => {
    expect(() => insertNotification(db, 9999, "due", "email")).toThrow(
      /FOREIGN KEY/i,
    );
  });

  it("rejects a type outside the allowed set", () => {
    expect(() => insertNotification(db, userId, "bogus", "email")).toThrow(
      /CHECK/i,
    );
  });

  it("rejects an empty channels value", () => {
    expect(() => insertNotification(db, userId, "due", "")).toThrow(/CHECK/i);
  });
});
