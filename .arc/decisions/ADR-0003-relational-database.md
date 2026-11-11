---
id: ADR-0003
category: component
title: Relational Database
status: accepted
superseded_by: null
component_id: comp_relational_database
responsibility: Persists notifications, per-channel delivery status (sent or failed)
  and the tenant association that backs the history view. Today the root app opens
  an embedded SQLite file through Drizzle (better-sqlite3); the Server workspace lists
  Prisma instead. Which product the notification data lands on, and whether it is
  managed or self-run, is open.
kind: infrastructure
serves:
- EXPENSE-TRACKER-2-EPIC-010
- EXPENSE-TRACKER-2-STORY-013
- EXPENSE-TRACKER-2-STORY-017
split_reason: Data store the project uses but doesn't build. Code already holds a
  SQLite/Drizzle store (src/db/); the notification stories add tables to it.
evidence: 'Codebase scan: src/db/client.ts (better-sqlite3 + drizzle-orm), src/db/schema.ts,
  package.json; server/package.json lists @prisma/client. Needed by EXPENSE-TRACKER-2-STORY-013
  and STORY-017.'
---

## Context

Codebase scan: src/db/client.ts (better-sqlite3 + drizzle-orm), src/db/schema.ts, package.json; server/package.json lists @prisma/client. Needed by EXPENSE-TRACKER-2-STORY-013 and STORY-017.

Serves: EXPENSE-TRACKER-2-EPIC-010, EXPENSE-TRACKER-2-STORY-013, EXPENSE-TRACKER-2-STORY-017.

## Decision

Persists notifications, per-channel delivery status (sent or failed) and the tenant association that backs the history view. Today the root app opens an embedded SQLite file through Drizzle (better-sqlite3); the Server workspace lists Prisma instead. Which product the notification data lands on, and whether it is managed or self-run, is open.

Kept separate because Data store the project uses but doesn't build. Code already holds a SQLite/Drizzle store (src/db/); the notification stories add tables to it..
