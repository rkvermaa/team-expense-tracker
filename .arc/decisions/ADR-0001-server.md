---
id: ADR-0001
category: component
title: Server
status: accepted
superseded_by: null
component_id: comp_server
responsibility: 'Express API. Owns notification delivery: the shared send mechanism
  over in-app and email channels, per-channel delivery status recording and failure
  logging, the in-app fallback when email fails, the active/authenticated-tenant check
  before sending, and the read-only per-tenant notification history endpoint. Also
  hosts, as modules, the scheduled triggers for payment-due reminders (a configurable
  number of days before the due date) and overdue notices, and the payment-confirmation
  trigger.'
kind: api_service
serves:
- EXPENSE-TRACKER-2-EPIC-010
- EXPENSE-TRACKER-2-STORY-013
- EXPENSE-TRACKER-2-STORY-014
- EXPENSE-TRACKER-2-STORY-015
- EXPENSE-TRACKER-2-STORY-016
- EXPENSE-TRACKER-2-STORY-017
split_reason: exists in the code
talks_to:
- component_id: comp_relational_database
  interaction: sync
  evidence: EXPENSE-TRACKER-2-STORY-013 (record delivery status) and STORY-017 (read
    the tenant's own notification history).
- component_id: comp_email_delivery_service
  interaction: sync
  evidence: 'EXPENSE-TRACKER-2-STORY-013: the email channel is attempted by default,
    and a failure is logged while the in-app notification still goes out.'
evidence: 'Codebase scan: declared in the package.json workspaces; uses Express. Notification
  stories EXPENSE-TRACKER-2-STORY-013 and STORY-017 need server-side delivery and
  history.'
---

## Context

Codebase scan: declared in the package.json workspaces; uses Express. Notification stories EXPENSE-TRACKER-2-STORY-013 and STORY-017 need server-side delivery and history.

Serves: EXPENSE-TRACKER-2-EPIC-010, EXPENSE-TRACKER-2-STORY-013, EXPENSE-TRACKER-2-STORY-014, EXPENSE-TRACKER-2-STORY-015, EXPENSE-TRACKER-2-STORY-016, EXPENSE-TRACKER-2-STORY-017.

## Decision

Express API. Owns notification delivery: the shared send mechanism over in-app and email channels, per-channel delivery status recording and failure logging, the in-app fallback when email fails, the active/authenticated-tenant check before sending, and the read-only per-tenant notification history endpoint. Also hosts, as modules, the scheduled triggers for payment-due reminders (a configurable number of days before the due date) and overdue notices, and the payment-confirmation trigger.

Kept separate because exists in the code.

## Talks to

- **Relational Database** (sync) — EXPENSE-TRACKER-2-STORY-013 (record delivery status) and STORY-017 (read the tenant's own notification history).
- **Email Delivery Service** (sync) — EXPENSE-TRACKER-2-STORY-013: the email channel is attempted by default, and a failure is logged while the in-app notification still goes out.
