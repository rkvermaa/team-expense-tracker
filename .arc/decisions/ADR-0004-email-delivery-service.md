---
id: ADR-0004
category: component
title: Email Delivery Service
status: accepted
superseded_by: null
component_id: comp_email_delivery_service
responsibility: Third-party provider that sends the email channel of notifications.
  The product is open.
kind: managed_service
serves:
- EXPENSE-TRACKER-2-EPIC-010
- EXPENSE-TRACKER-2-STORY-013
split_reason: Backing service the project uses but doesn't build; STORY-013 requires
  email delivery by default, with failures logged.
evidence: proposed, from EXPENSE-TRACKER-2-STORY-013 (email channel and email-failure
  handling) and EXPENSE-TRACKER-2-EPIC-010.
---

## Context

proposed, from EXPENSE-TRACKER-2-STORY-013 (email channel and email-failure handling) and EXPENSE-TRACKER-2-EPIC-010.

Serves: EXPENSE-TRACKER-2-EPIC-010, EXPENSE-TRACKER-2-STORY-013.

## Decision

Third-party provider that sends the email channel of notifications. The product is open.

Kept separate because Backing service the project uses but doesn't build; STORY-013 requires email delivery by default, with failures logged..
