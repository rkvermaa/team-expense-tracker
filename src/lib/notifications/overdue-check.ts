import { and, eq, isNull, lt, notInArray } from "drizzle-orm";

import type { Db } from "../../db/client.js";
import { notifications, rentPayments } from "../../db/schema.js";

export type OverdueNotification = {
  id: number;
  userId: number;
  rentPaymentId: number;
};

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Finds unpaid rent payments whose due date has passed as of `asOf` and
 * records a payment_overdue notification for each one not already notified.
 */
export function runOverdueCheck(
  db: Db,
  asOf: Date = new Date(),
): OverdueNotification[] {
  const cutoff = toDateOnly(asOf);

  return db.transaction((tx) => {
    const alreadyNotified = tx
      .select({ rentPaymentId: notifications.rentPaymentId })
      .from(notifications)
      .where(eq(notifications.type, "payment_overdue"))
      .all()
      .map((row) => row.rentPaymentId);

    const overdue = tx
      .select({ id: rentPayments.id, tenantId: rentPayments.tenantId })
      .from(rentPayments)
      .where(
        and(
          lt(rentPayments.dueDate, cutoff),
          isNull(rentPayments.paidAt),
          alreadyNotified.length > 0
            ? notInArray(rentPayments.id, alreadyNotified)
            : undefined,
        ),
      )
      .all();

    return overdue.map((payment) => {
      const result = tx
        .insert(notifications)
        .values({
          userId: payment.tenantId,
          type: "payment_overdue",
          rentPaymentId: payment.id,
        })
        .run();

      return {
        id: Number(result.lastInsertRowid),
        userId: payment.tenantId,
        rentPaymentId: payment.id,
      };
    });
  });
}
