import { desc, eq } from "drizzle-orm";

import type { Db } from "../client.js";
import { notifications, type NotificationType } from "../schema.js";

export type NotificationRecord = {
  id: number;
  type: NotificationType;
  channels: string[];
  sentAt: string;
};

/**
 * Returns the given user's notifications, most-recently-sent first.
 * Scoped strictly to `userId` so one tenant never sees another's rows.
 */
export function getNotificationsForUser(
  db: Db,
  userId: number,
): NotificationRecord[] {
  const rows = db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.sentAt))
    .all();

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    channels: row.channels.split(","),
    sentAt: row.sentAt,
  }));
}
