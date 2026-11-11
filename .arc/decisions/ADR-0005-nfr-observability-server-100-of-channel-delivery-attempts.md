---
id: ADR-0005
category: nfr
title: "NFR: observability (Server) \u2014 100% of channel delivery attempts record\
  \ sent/failed; every email failure is\u2026"
status: accepted
superseded_by: null
dimension: observability
metric: delivery_status_recorded
threshold: 100% of channel delivery attempts record sent/failed; every email failure
  is logged
component_id: comp_server
needs_dedicated_tracking: true
evidence: 'EXPENSE-TRACKER-2-STORY-013 (nfr: observability) acceptance criteria on
  logging email failures and recording per-channel delivery status.'
---

## Context

EXPENSE-TRACKER-2-STORY-013 (nfr: observability) acceptance criteria on logging email failures and recording per-channel delivery status.

## Decision

delivery_status_recorded: 100% of channel delivery attempts record sent/failed; every email failure is logged

Applies to Server.
