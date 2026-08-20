import { createDb } from "@/db/client";

export const db = createDb(process.env.DATABASE_PATH ?? "data/expense-tracker.db");
