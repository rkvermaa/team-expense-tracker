# ADR Index

One line per decision — the rule, not the reasoning. Read the full ADR (`.arc/decisions/ADR-NNNN-*.md`) for context and rationale.

| ADR | Category | Status | Title |
|---|---|---|---|
| ADR-0001 | component | accepted | Server |
| ADR-0002 | component | accepted | Web |
| ADR-0003 | component | accepted | Relational Database |
| ADR-0004 | component | accepted | Email Delivery Service |
| ADR-0005 | nfr | accepted | NFR: observability (Server) — 100% of channel delivery attempts record sent/failed; every email failure is… |
| ADR-0006 | nfr | accepted | NFR: reliability (Server) — in-app notification delivered even when email fails |
| ADR-0007 | nfr | accepted | NFR: accessibility (Web) — WCAG 2.1 AA, at least 4.5:1; screen-reader text alternatives announced |
| ADR-0008 | nfr | accepted | NFR: security — a tenant sees only their own notifications; no delete or archive action exposed |
| ADR-0009 | deployment_target | accepted | Deployment target: One project-wide target for the two Node workspaces (Server on Express, Web on… |
| ADR-0010 | integration_surface | accepted | Integration: Email Provider (outbound) |
| ADR-0011 | cross_cutting | accepted | Cross-cutting: auth |
| ADR-0012 | cross_cutting | accepted | Cross-cutting: observability |
