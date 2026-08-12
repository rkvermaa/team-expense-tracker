import { mkdirSync } from "node:fs";
import path from "node:path";

import { createDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import { seed } from "./seed.js";

const dbPath = process.env.DATABASE_PATH ?? "data/expense-tracker.db";

if (dbPath !== ":memory:") {
  mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = createDb(dbPath);
try {
  runMigrations(db);
  seed(db);
} finally {
  db.$client.close();
}

console.log(`Demo data seeded into ${dbPath}`);
