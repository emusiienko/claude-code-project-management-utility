# ADR-033: Prod stack exposed to other local projects over a fixed-name Docker network

**Date**: 2026-10-03
**Status**: Accepted
**Decision**: The prod stack owns a Docker network with a fixed, non-project-scoped name, `aiacu-external-access`, which devcontainers of other projects on the same machine join as an external network by name.
- Members: the backend (REST + MCP), under the alias `aiacu-backend`, and a second, in-network Web UI instance under the alias `aiacu-web`. That instance is the same Web UI build with the backend's network alias baked in as its API address, and it publishes no host port. The host-facing Web UI and PostgreSQL stay off the network.
- The backend's allowed CORS origins list both prod page origins: the host-facing Web UI and the in-network one.
- Prod only: the dev stack never creates the network, never joins it, and never builds or starts the in-network prod Web UI instance. Its own agent access stays on its separate dev-only network.
- The access boundary is restated from "the localhost port binding only" to "this machine": the localhost port binding, plus Docker networks the stack deliberately exposes to other containers on the same Docker daemon. No authentication is added.

This refines, and does not supersede, ADR-030: container, volume, and network isolation still comes from Compose project naming, except for this one deliberately fixed-name network.

**Options Considered**:
- Consumers call the backend through the host-port binding (`host.docker.internal:8000`). Rejected: it depends on per-platform host-gateway resolution inside each consumer, and the backend's Web UI build would still point at `localhost`, which a browser inside another container cannot reach.
- A project-scoped (Compose-prefixed) network name. Rejected: the name would change with the checkout folder name, so consumers' configuration would break.
- A network pre-created outside the stack and joined by it as external. Rejected by the user: the stack itself owns the network.
- Attaching the existing host-facing Web UI and PostgreSQL as well. Rejected: the host-facing UI's build points at `localhost`, which is useless from another container, and no consumer needs the database.
- One Web UI instance behind a same-origin reverse proxy that forwards API calls (no second instance, no second CORS origin). Rejected: it reverses the established "browser calls the backend directly" design and would make prod differ from the dev stack's in-network instance pattern.
- A fixed-name network plus an in-network Web UI instance, prod only (chosen).

**Rationale**: Joining a Docker network requires access to the local Docker daemon, which already grants control of the machine. The set of people and processes who can reach the unauthenticated API therefore stays the same — the local machine's user and what they run — so the no-authentication trust model still holds. Other projects' agents fit the existing AI Agents actor and call the same REST and MCP surfaces. A fixed name keeps consumers stable across `down`/`up` and across checkout folder names. Project-unique aliases prevent clashes with other projects' own service names on the shared network. A second Web UI instance follows the dev stack's existing in-network instance pattern, because a Web UI build carries one backend address.

**Trade-offs**: The network path bypasses the `127.0.0.1` port binding, so "only the port binding" is no longer a complete description of the boundary. Dev/prod isolation on the shared network relies on convention: a dev checkout started without the deploy entry point would join the network under the same aliases, and Docker DNS would split other projects' calls between the prod and dev backends. The prod stack builds one more image. The prod stack must be up before a consumer starts, and the prod environment configuration must list the second CORS origin.
