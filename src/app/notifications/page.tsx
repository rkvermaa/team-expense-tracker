import { cookies } from "next/headers";

import { db } from "@/db/runtime";
import { getNotificationsForUser } from "@/db/queries/notifications";
import type { NotificationType } from "@/db/schema";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

const TYPE_LABEL: Record<NotificationType, string> = {
  due: "Due",
  confirmation: "Confirmation",
  overdue: "Overdue",
};

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  in_app: "In-app",
};

function formatSentAt(sentAt: string): string {
  return sentAt.slice(0, 10);
}

function formatChannels(channels: string[]): string {
  return channels.map((channel) => CHANNEL_LABEL[channel] ?? channel).join(", ");
}

export default async function NotificationsPage() {
  const cookieStore = await cookies();
  const session = await verifySession(cookieStore.get(SESSION_COOKIE)?.value);
  const rows = session
    ? getNotificationsForUser(db, Number(session.sub))
    : [];

  return (
    <main>
      <h1>Notification history</h1>
      {rows.length === 0 ? (
        <p>You have no notifications yet.</p>
      ) : (
        <ul>
          {rows.map((notification) => {
            const label = TYPE_LABEL[notification.type];
            const sentAt = formatSentAt(notification.sentAt);
            const channels = formatChannels(notification.channels);
            const text = `${label} notification sent on ${sentAt} via ${channels}`;
            return (
              <li key={notification.id} aria-label={text}>
                {text}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
