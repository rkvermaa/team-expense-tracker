import { fileURLToPath } from "node:url";
import path from "node:path";

import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import type { Db } from "./client.js";

const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../drizzle",
);

/**
 * Applies all pending migrations from the drizzle/ folder.
 * Idempotent: already-applied migrations are recorded in a journal table
 * and skipped on subsequent runs.
 */
export function runMigrations(db: Db): void {
  migrate(db, { migrationsFolder });
}
