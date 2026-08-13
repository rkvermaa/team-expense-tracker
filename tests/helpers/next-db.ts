import path from "node:path";
import { fileURLToPath } from "node:url";

import { eq } from "drizzle-orm";

import { createDb } from "../../src/db/client.js";
import { users } from "../../src/db/schema.js";
import { EMPLOYEE_EMAIL } from "../../src/lib/seed-data.js";
import { NEXT_E2E_DB_PATH } from "./env.js";

// ES module scope ("type": "module"): __dirname is not a global here.
const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Reads the seeded demo employee's real id from the Next.js E2E database, so
 * tests mint a session token whose `sub` matches the owner of the seeded
 * expenses instead of assuming an autoincrement value.
 */
export function employeeUserId(): number {
  const dbPath = path.resolve(dirname, "../..", NEXT_E2E_DB_PATH);
  const db = createDb(dbPath);
  try {
    const row = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, EMPLOYEE_EMAIL))
      .get();
    if (!row) {
      throw new Error(
        `employeeUserId: no user with email ${EMPLOYEE_EMAIL} in ${dbPath}; is global-setup seeding the Next E2E DB?`,
      );
    }
    return row.id;
  } finally {
    db.$client.close();
  }
}
