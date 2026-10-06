# Technical Documentation

As-built technical/system-facing documentation — architect's counterpart to
[`documentation/business/`](../business/). Start at **[`sad.md`](sad.md)** (the Software Architecture
Document, the master/entry doc). Everything below is referenced from it.

| Artifact | File | What it covers |
|---|---|---|
| Software Architecture Document | [`sad.md`](sad.md) | Master/entry doc: goals, C4 diagrams, ADR table, NFR + decisions summary, risks |
| Solution Overview | [`solution-overview/solution-overview.md`](solution-overview/solution-overview.md) | Purpose, scope, system context, key components, tech stack, data/error/auth flows |
| — C4 Level 1 (context) | [`solution-overview/system-context.yaml`](solution-overview/system-context.yaml) + [`.mmd`](solution-overview/system-context.mmd) | Actors and boundary — graph data + generated diagram |
| — C4 Level 2 (containers) | [`solution-overview/key-components.yaml`](solution-overview/key-components.yaml) + [`.mmd`](solution-overview/key-components.mmd) | Top-level containers — graph data + generated diagram |
| Non-Functional Requirements | [`nfr.md`](nfr.md) | Measurable performance, concurrency, accessibility, platform, limits, security targets |
| Physical Data Model | [`data-models/physical-data-model.md`](data-models/physical-data-model.md) | As-built schema — tables, relations/cascade, indexes, portability, seed (single DB-agnostic store) |
| API Contracts | [`api-contracts/coordination-service.md`](api-contracts/coordination-service.md) | The one backend service (REST + path-mounted MCP), LOCKED |
| Deployment / Infrastructure View | [`deployment/deployment-infrastructure-view.md`](deployment/deployment-infrastructure-view.md) | System-level topology (not IaC) |
| ADR Log | [`adr-log/`](adr-log/) | 35 architecture decision records ([`ADR-001`](adr-log/ADR-001-backend-stack-python-fastapi.md)…[`ADR-035`](adr-log/ADR-035-sqlite-fk-enforcement-database-sole-cascade.md)); next id ADR-036 |

Migrated from an earlier single-file architecture document, API contract, decision folder, and
technical roadmap, all since deleted — this folder is the only technical documentation there is, and
the superseded files survive in git history alone. Reads as current state; provenance history lives
in git and in the ADRs.

The business-facing counterpart, including the **Conceptual and Logical Data Models**, is
[`documentation/business/`](../business/).
