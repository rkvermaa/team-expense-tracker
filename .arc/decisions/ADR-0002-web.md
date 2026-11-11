---
id: ADR-0002
category: component
title: Web
status: accepted
superseded_by: null
component_id: comp_web
responsibility: React tenant portal. Shows in-app notifications and the read-only
  notification history (most recent first, empty state, type/date/channel per entry,
  no delete or archive), meeting WCAG 2.1 AA contrast and screen-reader requirements.
kind: web_ui
serves:
- EXPENSE-TRACKER-2-EPIC-010
- EXPENSE-TRACKER-2-STORY-017
split_reason: exists in the code
talks_to:
- component_id: comp_server
  interaction: sync
  evidence: 'EXPENSE-TRACKER-2-STORY-017: an authenticated tenant opens their notification
    history in the portal. Web (React) and Server (Express) are existing scanned components.'
evidence: 'Codebase scan: declared in the package.json workspaces; uses React. EXPENSE-TRACKER-2-STORY-017
  requires a tenant-facing history view in the portal.'
---

## Context

Codebase scan: declared in the package.json workspaces; uses React. EXPENSE-TRACKER-2-STORY-017 requires a tenant-facing history view in the portal.

Serves: EXPENSE-TRACKER-2-EPIC-010, EXPENSE-TRACKER-2-STORY-017.

## Decision

React tenant portal. Shows in-app notifications and the read-only notification history (most recent first, empty state, type/date/channel per entry, no delete or archive), meeting WCAG 2.1 AA contrast and screen-reader requirements.

Kept separate because exists in the code.

## Talks to

- **Server** (sync) — EXPENSE-TRACKER-2-STORY-017: an authenticated tenant opens their notification history in the portal. Web (React) and Server (Express) are existing scanned components.
