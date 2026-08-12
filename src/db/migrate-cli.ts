import { mkdirSync } from "node:fs";
import path from "node:path";

import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";

const dbPath = process.env.DATABASE_PATH ?? "data/expense-tracker.db";

if (dbPath !== ":memory:") {
  mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = createDb(dbPath);
runMigrations(db);
db.$client.close();

console.log(`Migrations applied to ${dbPath}`);
