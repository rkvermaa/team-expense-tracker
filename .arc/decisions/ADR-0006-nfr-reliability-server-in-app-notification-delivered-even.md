---
id: ADR-0006
category: nfr
title: "NFR: reliability (Server) \u2014 in-app notification delivered even when email\
  \ fails"
status: accepted
superseded_by: null
dimension: reliability
metric: in_app_fallback_on_email_failure
threshold: in-app notification delivered even when email fails
component_id: comp_server
needs_dedicated_tracking: true
evidence: 'EXPENSE-TRACKER-2-STORY-013 (nfr: reliability): in-app is the guaranteed
  fallback channel when email fails.'
---

## Context

EXPENSE-TRACKER-2-STORY-013 (nfr: reliability): in-app is the guaranteed fallback channel when email fails.

## Decision

in_app_fallback_on_email_failure: in-app notification delivered even when email fails

Applies to Server.
