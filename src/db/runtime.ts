import { createDb } from "./client.js";

/**
 * One module-scoped connection shared by every server component, matching
 * the `DATABASE_PATH` convention used by migrate-cli.ts / seed-cli.ts.
 */
export const db = createDb(process.env.DATABASE_PATH ?? "data/expense-tracker.db");
