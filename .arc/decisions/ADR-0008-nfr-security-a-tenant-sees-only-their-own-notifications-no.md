---
id: ADR-0008
category: nfr
title: "NFR: security \u2014 a tenant sees only their own notifications; no delete\
  \ or archive action exposed"
status: accepted
superseded_by: null
dimension: security
metric: tenant_data_isolation
threshold: a tenant sees only their own notifications; no delete or archive action
  exposed
component_id: null
needs_dedicated_tracking: true
evidence: 'EXPENSE-TRACKER-2-STORY-017 (nfr: security) and EXPENSE-TRACKER-2-EPIC-010
  acceptance criteria (notifications only to authenticated, active tenant accounts).'
---

## Context

EXPENSE-TRACKER-2-STORY-017 (nfr: security) and EXPENSE-TRACKER-2-EPIC-010 acceptance criteria (notifications only to authenticated, active tenant accounts).

## Decision

tenant_data_isolation: a tenant sees only their own notifications; no delete or archive action exposed
