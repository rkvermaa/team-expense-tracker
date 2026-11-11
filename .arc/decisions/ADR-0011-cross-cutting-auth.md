---
id: ADR-0011
category: cross_cutting
title: 'Cross-cutting: auth'
status: accepted
superseded_by: null
component_id: null
decision: Only authenticated, active tenant accounts receive notifications, and the
  history endpoint returns only the requesting tenant's own notifications. The code
  already has JWT session cookies (jose), bcrypt password hashing and role-based route
  guards in the root app (src/lib/auth/session.ts, src/lib/auth/route-policy.ts, src/middleware.ts);
  the Server workspace also lists jsonwebtoken and bcryptjs.
evidence: 'Codebase scan: src/lib/auth/session.ts, src/lib/auth/route-policy.ts, src/middleware.ts,
  package.json (jose, bcryptjs), server/package.json; EXPENSE-TRACKER-2-EPIC-010,
  STORY-013, STORY-017.'
---

## Context

Codebase scan: src/lib/auth/session.ts, src/lib/auth/route-policy.ts, src/middleware.ts, package.json (jose, bcryptjs), server/package.json; EXPENSE-TRACKER-2-EPIC-010, STORY-013, STORY-017.

## Decision

Only authenticated, active tenant accounts receive notifications, and the history endpoint returns only the requesting tenant's own notifications. The code already has JWT session cookies (jose), bcrypt password hashing and role-based route guards in the root app (src/lib/auth/session.ts, src/lib/auth/route-policy.ts, src/middleware.ts); the Server workspace also lists jsonwebtoken and bcryptjs.
