---
id: ADR-0012
category: cross_cutting
title: 'Cross-cutting: observability'
status: accepted
superseded_by: null
component_id: null
decision: Every notification delivery attempt records its per-channel status, and
  email failures are logged, through one shared delivery mechanism used by all notification
  types.
evidence: 'EXPENSE-TRACKER-2-STORY-013 (nfr: observability, reliability).'
---

## Context

EXPENSE-TRACKER-2-STORY-013 (nfr: observability, reliability).

## Decision

Every notification delivery attempt records its per-channel status, and email failures are logged, through one shared delivery mechanism used by all notification types.
