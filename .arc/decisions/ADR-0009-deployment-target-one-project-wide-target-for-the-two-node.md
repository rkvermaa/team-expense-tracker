---
id: ADR-0009
category: deployment_target
title: "Deployment target: One project-wide target for the two Node workspaces (Server\
  \ on Express, Web on\u2026"
status: accepted
superseded_by: null
component_id: null
decision: One project-wide target for the two Node workspaces (Server on Express,
  Web on React), the database and the email provider. Cloud provider, how it is run
  (containers, serverless, VMs), environments and region topology are not settled
  by the backlog or the code and stay open.
evidence: 'Codebase scan: server and web declared as package.json workspaces. No backlog
  item or current architecture entry states hosting, regions or environments.'
---

## Context

Codebase scan: server and web declared as package.json workspaces. No backlog item or current architecture entry states hosting, regions or environments.

## Decision

One project-wide target for the two Node workspaces (Server on Express, Web on React), the database and the email provider. Cloud provider, how it is run (containers, serverless, VMs), environments and region topology are not settled by the backlog or the code and stay open.
