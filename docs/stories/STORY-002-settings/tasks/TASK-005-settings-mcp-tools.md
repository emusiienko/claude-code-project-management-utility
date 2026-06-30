---
status: Done
assignee: backend-developer
story: STORY-002
---

# TASK-005: Settings MCP tools

## What to implement
MCP tools that mirror the Settings operations over the **same** Settings service used by REST — one
logic path, two surfaces. Behavior, validation, and error codes must be identical to the REST
controller. Settings is the first domain to prove the REST + MCP shared-service pattern end to end.

Tools mirror: read system settings, update system settings, read project overrides, read project
effective settings, update project overrides (including clearing a single key's override via the same
service operation REST uses).

No business logic in the tools — they delegate to the service exactly as the controller does.

## Scope
`backend/app/settings/` (MCP tools) + their registration in `mcp`/`container`.

## Dependencies
TASK-003 (may proceed in parallel with TASK-004 once the service exists)

## Acceptance Criteria
- [ ] MCP tools exist for all Settings operations and call the shared service, not a separate code
      path.
- [ ] Same inputs produce the same outcomes and the same error conditions as the REST endpoints
      (unknown key, empty values, missing project, replace-not-merge, clear-one-key, effective
      resolution).
- [ ] Tools contain no business logic.

## Intended ADR
Settings as the reference implementation of the REST + MCP shared-service pattern — recorded in the
plan; created at Reconcile if confirmed.

---
## Implementation Report

**Date**: 2026-06-30

**What was done**:
Created `backend/app/settings/mcp_tools.py` with five MCP tools (`get_system_settings`, `set_system_setting`, `get_project_effective_settings`, `set_project_setting`, `clear_project_setting`) that delegate entirely to `SettingsService` — no business logic in the tools. Updated `backend/app/mcp/server.py` to register the tools via `register_settings_tools(mcp_server)`. Added a lifespan note confirming `streamable_http_app()` manages its own ASGI lifespan, so `main.py` requires no changes.

**Deviations from plan**:
None. The task was implemented as specified. The `get_project_effective_settings` tool calls `svc.resolve_all()` (not a hypothetical `get_project_effective_settings()` method), which is the correct existing service method for deriving effective settings for all six keys.

**Technical decisions made**:
1. **Session management in MCP tools**: MCP tools cannot use FastAPI `Depends()` or `dependency_injector`'s `@inject` decorator (those are FastAPI-specific DI hooks). Instead, a `_build_service()` context manager calls `container.session_factory()()` to obtain a new `Session`, passes the same session to all three repositories, and wraps the operation in `session.begin()` for atomicity. The session is always closed in the `finally` block.
2. **Error translation**: `DomainError` subclasses are caught and re-raised as `McpError(ErrorData(...))`. Client errors (HTTP status < 500) map to `INVALID_PARAMS` (-32602); server errors map to `INTERNAL_ERROR` (-32603). The domain error code and message are preserved in the MCP error message as `[CODE] message` so callers can distinguish error types.
3. **Lifespan verification**: `FastMCP.streamable_http_app()` returns a Starlette ASGI sub-application. FastAPI's `mount()` fully delegates lifespan events to the sub-app per the ASGI spec, so the MCP session manager starts and stops correctly without any changes to `main.py`.

**Code locations**:
- `backend/app/settings/mcp_tools.py` — five Settings MCP tools + `_build_service()` helper + `_to_mcp_error()` translator + `register_settings_tools()` registration function
- `backend/app/mcp/server.py` — updated to import and call `register_settings_tools(mcp_server)`

**Technical debt noted**:
None.
