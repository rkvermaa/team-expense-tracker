import { createDb } from "./client.js";

export const db = createDb(process.env.DATABASE_PATH ?? "data/expense-tracker.db");
