import { describe, expect, it } from "vitest";

import type { Db } from "../../src/db/client.js";
import { getNotificationsForUser } from "../../src/db/queries/notifications.js";
import { freshDb } from "../helpers/db.js";

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
  args: { userId: number; type: string; channels?: string; sentAt?: string },
) {
  db.$client
    .prepare(
      `INSERT INTO notifications (user_id, type, channels, sent_at)
       VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
    )
    .run(
      args.userId,
      args.type,
      args.channels ?? "email",
      args.sentAt ?? null,
    );
}

describe("getNotificationsForUser (AC1, AC2, AC7)", () => {
  it("returns notifications most-recent-first", () => {
    const db = freshDb();
    const userId = insertUser(db, "tenant@example.com");
    insertNotification(db, { userId, type: "due", sentAt: "2026-09-01 10:00:00" });
    insertNotification(db, { userId, type: "overdue", sentAt: "2026-09-10 10:00:00" });
    insertNotification(db, { userId, type: "confirmation", sentAt: "2026-09-05 10:00:00" });

    const result = getNotificationsForUser(db, userId);

    expect(result.map((n) => n.type)).toEqual([
      "overdue",
      "confirmation",
      "due",
    ]);
  });

  it("expands the stored channels string into an array", () => {
    const db = freshDb();
    const userId = insertUser(db, "tenant2@example.com");
    insertNotification(db, { userId, type: "due", channels: "email,in_app" });

    const result = getNotificationsForUser(db, userId);

    expect(result[0]?.channels).toEqual(["email", "in_app"]);
  });

  it("returns an empty array for a user with no notifications", () => {
    const db = freshDb();
    expect(getNotificationsForUser(db, 999999)).toEqual([]);
  });

  it("does not return another user's notifications", () => {
    const db = freshDb();
    const tenantA = insertUser(db, "a@example.com");
    const tenantB = insertUser(db, "b@example.com");
    insertNotification(db, {
      userId: tenantB,
      type: "due",
      sentAt: "2026-09-10 10:00:00",
    });

    expect(getNotificationsForUser(db, tenantA)).toEqual([]);
  });
});
