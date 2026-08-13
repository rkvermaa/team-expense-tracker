import { createDb, type Db } from "@/db/client";

/**
 * Process-wide singleton Drizzle handle for request-time reads. The path
 * mirrors the CLI contract (`DATABASE_PATH`, defaulting to the same file the
 * migrate/seed CLIs write), so the app reads exactly what those tools produce.
 * better-sqlite3 is synchronous and native, so the owning route must run on
 * the Node.js runtime.
 */
let db: Db | undefined;

export function getDb(): Db {
  if (!db) {
    db = createDb(process.env.DATABASE_PATH ?? "data/expense-tracker.db");
  }
  return db;
}
