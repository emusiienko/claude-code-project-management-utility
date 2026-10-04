# ADR-033: Prod stack exposed to other local projects over a fixed-name Docker network

**Date**: 2026-10-03
**Status**: Accepted
**Decision**: The prod stack owns a Docker network with a fixed, non-project-scoped name, `aiacu-external-access`, which other projects' devcontainers on the same machine join as an external network.
- Members: the backend (REST + MCP) as `aiacu-backend`, and a second Web UI instance as `aiacu-web`, built with that backend alias as its API address and publishing no host port. The host-facing Web UI and PostgreSQL stay off the network.
- The backend's CORS origins list both prod Web UI origins.
- Prod only: the dev stack never creates, joins, or builds anything for this network.
- The access boundary becomes "this machine": the localhost port binding plus networks the stack deliberately exposes on the same Docker daemon. No authentication is added.

This refines ADR-030 and does not supersede it: Compose project naming still isolates everything except this one fixed-name network.

**Options Considered**:
- Host-port access via `host.docker.internal`. Rejected: host-gateway resolution depends on the platform, and the Web UI build points at `localhost`, which a browser inside another container can't reach.
- A project-scoped network name. Rejected: it changes with the checkout folder name.
- A network created outside the stack. Rejected by the user: the stack owns it.
- Also attaching the host-facing Web UI and PostgreSQL. Rejected: that UI build is unusable from a container, and no consumer needs the database.
- One Web UI behind a same-origin API proxy. Rejected: it reverses the existing "browser calls the backend directly" design and breaks parity with the dev stack's in-network instance.

**Rationale**: Joining a Docker network requires Docker daemon access, which already means control of the machine, so the no-auth trust model still holds. Other projects' agents fit the existing AI Agents actor. Project-unique aliases avoid clashes on the shared network.

**Trade-offs**: The network bypasses the `127.0.0.1` binding. Dev/prod separation on the network relies on convention: a dev checkout started without the deploy entry point would join under the same aliases and split traffic. The stack builds one more image, must be up before any consumer starts, and its prod environment configuration must list the second CORS origin.
