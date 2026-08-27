# ADR-003: MCP topology — shared service layer, HTTP transport

**Date**: 2026-06-29
**Status**: Superseded by ADR-007
**Decision**: The REST API and the MCP server are two thin adapters over the same per-app service layer. The MCP server runs as a long-lived HTTP (streamable) service in Docker; agents connect by URL on localhost.
**Options Considered**:
- Topology: shared service layer (chosen) vs MCP as an HTTP client of the REST API
- Transport: HTTP streamable (chosen) vs stdio subprocess per agent
**Rationale**: A shared service layer keeps business logic and validation in exactly one place, so the two surfaces cannot drift; it directly mitigates the validated-idea risk that "MCP evolves and breaks the agent interface" — protocol changes touch only the MCP adapter, not the data model. HTTP transport fits the "everything runs in Docker Compose, always on" model and supports multiple concurrent agents against one persistent stack and shared database.
**Trade-offs**: REST and MCP share a process boundary at the code level (same image, different entrypoint), so they are not independently deployable — acceptable for a single-machine tool. The HTTP MCP server is one more long-lived service to run versus an on-demand stdio subprocess.
