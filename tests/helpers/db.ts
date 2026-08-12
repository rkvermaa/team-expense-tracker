import { createDb, type Db } from "../../src/db/client.js";
import { runMigrations } from "../../src/db/migrate.js";

/** Returns a fully migrated in-memory database for tests. */
export function freshDb(): Db {
  const db = createDb(":memory:");
  runMigrations(db);
  return db;
}
