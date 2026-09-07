<!-- Default format for the Solution Overview artifact — accept as-is or customize with architect during Step 0 (Confirm Artifact Formats). The same shape serves both lifecycle stages: a draft, part of Architectural Design (Phase 1 — Scope Planning, see architectural-design-format.md), created at Project Setup (MODE 1) and updated at Plan Next Scope (MODE 2) only if scope/context/components actually change; and the as-built version living inside the Architecture folder (Technical Documentation), promoted/corrected against what was actually built at Reconcile (MODE 3). Text only — no diagrams or graph data inline; each references its own YAML (data) and Mermaid (diagram) file. -->

# Solution Overview

## Purpose
1–2 paragraphs: the business context, in plain language — why this system exists.

## Scope
- **In scope**: ...
- **Out of scope**: ...
- **Assumptions**: ...
- **Constraints**: ...

## System Context (C4 Level 1)
Users/roles and external systems this system talks to — the outermost boundary. See:
- Data: `system-context.yaml`
- Diagram: `system-context.mmd`

## Key Components (C4 Level 2)
Top-level containers — services, databases, queues, frontends — grouped by bounded context, container level only, never deeper. See:
- Data: `key-components.yaml`
- Diagram: `key-components.mmd`

## Tech Stack
Every system-level technology choice (language/runtime per service, cloud provider, managed services), with rationale. A choice significant enough for TECH DECISIONS POLICY gets its own ADR Log entry, referenced by ID — don't restate the rationale here too.

## Data Flow
How a request moves through the system, across services. Numbered steps or nested bullets.

## Authentication Flow
Numbered steps describing the login/session/refresh cycle across services. Per-endpoint auth requirements live in each service's API Contract, referenced from there — not repeated here.

## Error Handling Strategy
Cross-service error policy: error envelope shape, retry/circuit-breaking semantics, user-facing message policy. Per-endpoint error responses live in API Contract, referenced from there — not repeated here.

## Logging/Observability
Log structure, correlation IDs across services, where logs/traces go.

## Deployment Topology
System-level shape: which services exist, public vs internal exposure, shared infrastructure (DB, queues, gateway). Not literal env vars or IaC — that's devops's/lead-developer's domain. If this project has its own Deployment/Infrastructure View artifact, this subsection stays a short pointer to it instead of the full content.

## Key Decisions
One line per decision — confirmed ones referenced by ADR Log ID (e.g. "ADR-003: ..."), anticipated ones stated plainly with no ID yet (e.g. "Auth strategy — to be decided once implementation starts"). Never restate a confirmed decision's rationale or trade-offs; that lives in the ADR itself. An anticipated decision gets its ADR file — and its ID here — only once Reconcile confirms it (see MODE 3).
