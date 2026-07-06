# ADR-011: String-ID coercion in the base repository; field validation in schemas, business rules in the service

**Date**: 2026-07-06
**Status**: Accepted
**Decision**: Three cross-cutting placement rules, confirmed during the STORY-003 code review, govern where each kind of logic lives across all domains:

1. **String → UUID coercion lives in `BaseRepository`.** ID-lookup methods accept a `str` (matching the API contract, where every `id` is a string), convert it to `uuid.UUID` internally via a shared `_coerce_uuid` helper, and raise `NotFoundError` on a malformed string — a non-existent ID cannot correspond to a real row, so a bad ID surfaces as 404, not a validation error. Controllers, MCP tools, and services pass raw string IDs straight through; none of them parse UUIDs.

2. **Field-level validation lives in Pydantic input schemas.** Length, non-empty, and format checks run in `@field_validator` / `@model_validator` on the write schemas (`CreateProject`, `UpdateProject`), so invalid data is rejected by FastAPI's request-validation layer (HTTP 422) before it ever reaches the service.

3. **Business-rule validation lives in the service.** Uniqueness, cross-field, and external-state checks (e.g. case-insensitive name uniqueness against other rows) stay in the service, raising domain errors (`ConflictError` → 409, etc.).

Supporting this, `DomainError` carries a `to_tool_error()` instance method (deferred `fastmcp` import) so MCP tools convert any domain error to a `ToolError` with the same `[CODE] message` shape as REST — no per-module `_to_tool_error` helper.

**Options Considered**:
- Coerce IDs in `BaseRepository`; field validation in schemas; business rules in the service (chosen)
- Parse UUIDs in each controller / MCP tool (the original STORY-003 implementation — a `_parse_uuid` helper duplicated in both surfaces)
- Parse UUIDs in each domain service via a private `_parse_id` method (the BUG-010 intermediate state — duplicated across every future service)
- Keep field validation as private `_validate_*` methods on the service

**Rationale**: Placing coercion in `BaseRepository` gives every future domain the behavior for free — the repository is the only layer that actually needs a `UUID` object (to build the query), it already owns by-id lookup, and it knows the entity type for the `NotFoundError` message. Both alternatives duplicated the same parsing logic across N surfaces or N services. Treating a malformed ID as `NOT_FOUND` (not a 422) matches the contract, which declares only 404 for a bad/absent id on get/update/delete. Field validation in schemas means the service never sees structurally-invalid data and validation errors map to 422 through one path (request-validation), while business rules stay where they can see other rows. `to_tool_error()` on `DomainError` removes duplicated conversion helpers and keeps REST and MCP behavior-identical from a single source.

**Trade-offs**: Overloading `BaseRepository` methods to accept `str | UUID` slightly widens their signature and couples the data layer to the "bad id = not found" policy; a domain that ever needed to distinguish "malformed id" from "valid id, no row" would have to special-case it (none do today). Field validators duplicate the length/non-empty constants between create and update schemas — accepted as low-churn and explicit. These rules are recorded in `docs/backend-coding-conventions.md` (owned by backend-developer) as the normative source for implementors; this ADR records the architectural decision behind them.
