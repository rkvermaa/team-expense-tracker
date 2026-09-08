import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema> & {
  $client: Database.Database;
};

/**
 * Opens a SQLite database at the given path (or in memory with ":memory:")
 * with foreign key enforcement on, wrapped in Drizzle.
 */
export function createDb(path: string): Db {
  const sqlite = new Database(path);
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}
