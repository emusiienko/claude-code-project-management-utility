# ADR-001: Backend stack — Python + FastAPI

**Date**: 2026-06-29
**Status**: Accepted
**Decision**: Build the backend (REST API + MCP server) in Python 3.12 with FastAPI, Pydantic v2, and Uvicorn.
**Options Considered**:
- Node.js + TypeScript (Fastify/Express + official TS MCP SDK)
- Python + FastAPI (official Python MCP SDK)
- Go (net/http or chi + community MCP SDK)
**Rationale**: User preference for Python. FastAPI gives built-in request validation, OpenAPI generation, and async support with minimal boilerplate. Pydantic v2 cleanly expresses the request/response schemas and dictionary validation the requirements demand. The official Python MCP SDK is mature enough for an HTTP-served server.
**Trade-offs**: Backend and frontend are in different languages (Python vs JavaScript/React), so request/response types are not shared at the language level — the API contract (`docs/api-contract.md`) is the single source of truth instead. Go's single-binary deployment and raw throughput are given up, which is acceptable for a single-user local tool.
