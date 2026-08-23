<!-- Superseded by, business-facing content migrated during business-analyst Setup (STORY-001,
     2026-08-21): as-built behavior now lives in documentation/business/ (business-analyst's part of
     the Documentation artifact); pending/not-yet-built scope now lives in
     .fast-sdlc/requirements/specs/ (Requirements artifact). API contract / endpoint-shape content
     was intentionally not migrated — that content is architect's territory and already lives in
     docs/api-contract.md. Kept here as historical record only — not written to going forward. -->

# Requirements

This project is full-stack. Requirements are split into two documents:

- [**Backend Requirements**](requirements/requirements_backend.md) — REST API, MCP server, data model, validation rules, error handling, settings module, non-functional requirements
- [**Web UI Requirements**](requirements/requirements_web.md) — pages, navigation, component behaviours, forms, file uploads, accessibility, browser support

Both documents share the same data model entities. The Web UI requirements reference API endpoints defined in the backend requirements document.
