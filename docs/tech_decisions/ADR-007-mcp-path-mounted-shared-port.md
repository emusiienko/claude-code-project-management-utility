# ADR-007: MCP path-mounted on the shared backend port

**Date**: 2026-06-29
**Status**: Accepted
**Decision**: The MCP server is mounted on a path of the same backend application that serves the REST API — one container, one process, one port (`:8000`, e.g. `http://localhost:8000/mcp`). It is not exposed on a separate port and is not a separate process or entrypoint. This refines and supersedes ADR-003, which retained the shared-service-layer + HTTP-streamable-transport decision but described the MCP server as a long-lived service reached "by URL on localhost" with a separate entrypoint, leaving room for a distinct port (`:8001` had been carried in the architecture and earlier devops notes).
**Options Considered**:
- MCP on a separate port / separate process in the same image (the topology implied by ADR-003)
- MCP mounted as a sub-application on a path of the same FastAPI app and the same Uvicorn process (chosen)
**Rationale**: The MCP Python SDK's HTTP streamable transport can be mounted as an ASGI sub-application alongside the REST routes, so a second port and a second process buy nothing for a single-machine personal tool. One port means one thing to map to localhost, one process to run and observe, and no second health check or CORS surface. It keeps the shared-service-layer intent of ADR-003 intact — REST and MCP remain thin adapters over the same per-app services — while simplifying deployment. `docs/devops-strategy.md` already reflects this single-container, single-port topology.
**Trade-offs**: REST and MCP share not just an image but a single process and port, so they cannot be scaled, restarted, or rate-limited independently — acceptable and in fact desirable for a local single-developer utility. Path namespacing (`/mcp`) must stay clear of the REST route space.
