# Implementation Plan: STORY-003 — Project Management

## Context

A project is the outermost container in the utility — every story, task, attachment,
comment, and project-settings override ultimately belongs to a project. STORY-001 built
the backend/frontend foundation (core, DI container, REST app shell, MCP server, SPA
shell) and STORY-002 added the settings domain. Settings already references `project.id`
via a foreign key, but the `project` table itself does not yet exist: the `0002` migration
declares an inline `ForeignKeyConstraint` pointing at a table that has never been created.
This broke the very first deployment on PostgreSQL (which validates FK targets at
`CREATE TABLE` time, unlike SQLite). **Because that deployment failed, the migration chain
has never been applied — there is no deployed database and no data to preserve**, so we are
free to rewrite the chain rather than patch it append-only.

This story creates the `project` table for the first time and implements the full project
CRUD surface (REST + MCP) over a shared service layer, plus the Project Management screen
that replaces the existing placeholder. It is the first true domain entity and establishes
the per-domain package pattern (model → repository → service → schema → controller +
mcp_tools) that stories 004–009 and 012 will follow.

No cross-story roadmap dependencies beyond the implicit one already captured in the
stories index: every later content story depends on `project` existing. No separate
`docs/technical_roadmap.md` is needed.

## Technical Approach

**Persistence and migration ordering (root-first, no deferred FK).** The root cause of the
broken deployment is ordering: a child table (`project_settings`) was created before its
parent (`project`). Since the chain has never been applied, we fix the cause directly by
rewriting it into a clean, dependency-ordered sequence of **two** revisions rather than
patching with a deferred FK:

1. `0001_project` (`down_revision = None`) — creates the `project` table and, in the same
   revision, seeds one "Test Project" row.
2. `0002_settings` (`down_revision = 0001_project`) — creates `system_settings` and
   `project_settings`, with the `project_settings → project` FK declared **inline**
   (`ON DELETE CASCADE`), and seeds the six default dictionaries in the same revision.

Because `project` is created first, the inline FK is valid on both SQLite and PostgreSQL
with no `batch_alter_table` and no table rebuild. The old `0001_baseline`,
`0002_settings_schema`, and `0003_settings_seed` are deleted. `project.id` uses the
String(36)/native-UUID portability approach already established for `project_settings`.

This establishes the project-wide migration rule for all later stories: **create tables in
dependency order, declare FKs inline toward already-existing tables, and bundle each
table's seed data in the same revision as its schema.** With `project` as the root created
first, every future FK points "upward" to a table that already exists — the deferred-FK
problem cannot recur.

**Schema.** `project` carries `id` (UUID PK), `name` (1–200, unique case-insensitive),
`description` (nullable, max 5000), `created_at`, `updated_at`. Case-insensitive name
uniqueness is enforced dialect-aware inside the data layer (functional `LOWER()`
uniqueness), consistent with the architecture's portability rules. No `labels` on projects.

**Service layer is the single home for business rules.** A project service owns: name
normalization/uniqueness checking (create and update), description length validation,
pagination, single-fetch with not-found mapping, and cascade delete. Both REST and MCP
call this same service — neither surface holds logic. Cascade delete relies on the
database `ON DELETE CASCADE` chain (stories → tasks → attachments/versions/comments/links,
plus project_settings); the service issues a single delete and the FK graph removes nested
data atomically, so no partial state remains. Sessions linked to deleted stories/tasks are
handled by their own SET NULL FK (out of scope here, but the cascade contract assumes it).

**Uniqueness conflicts** surface as the domain conflict error with the exact contract
message "A project with this name already exists." (code `CONFLICT`), on both create and
update. The existing centralized `domain_error_handler` maps this to HTTP 409 for REST and
to the mirrored MCP tool error code.

**REST controller** exposes the five locked endpoints under `/v1` following the settings
controller pattern (router + FastAPI dependency that injects the service). Request/response
schemas are Pydantic models mirroring the locked contract exactly: `CreateProjectBody`,
`UpdateProjectBody`, `Project`, wrapped in the standard `Envelope` / `ListEnvelope`.

**MCP tools** mirror the same five operations as tools registered on the shared FastMCP
server via a `register_project_tools(mcp_server)` entrypoint, reusing the same service and
schemas so behavior is identical to REST. Tool names mirror the endpoints
(`create_project`, `list_projects`, `get_project`, `update_project`, `delete_project`).

**Frontend** replaces the Projects placeholder screen with a real management screen: a
paginated list, create/edit form, and delete with confirmation, wired through TanStack
Query hooks in `frontend/src/api/projects.ts` (the list hook already exists; this story adds
the CRUD mutations). Types already exist in `frontend/src/api/types.ts` (derived from the
locked contract). The conflict error message is surfaced to the user inline.

**Tests** (qa-automation) cover the service rules and both surfaces against a running app:
all five endpoints' happy paths and error paths, case-insensitive uniqueness on create and
update, cascade delete leaving no nested rows, and empty-list behavior.

## Ordered Tasks

1. TASK-001: Project persistence + migration chain rewrite — rewrite the chain into
   `0001_project` (project table + Test Project seed) and `0002_settings` (settings tables
   with inline FK to project + six-dictionary seed); delete the three old revisions; add the
   project ORM model and repository.
2. TASK-002: Project service (depends on TASK-001) — business rules: create/update with
   case-insensitive name uniqueness, validation, get-by-id, paginated list, cascade delete.
3. TASK-003: Project REST controller (depends on TASK-002) — five `/v1` endpoints with
   Pydantic schemas and dependency wiring, mounted on the REST app.
4. TASK-004: Project MCP tools (depends on TASK-002) — five tools mirroring the REST
   surface, registered on the shared FastMCP server.
5. TASK-005: Project Management screen (depends on TASK-003) — list + create/edit/delete UI
   and TanStack Query CRUD mutations replacing the placeholder.
6. TASK-006: Automated tests (depends on TASK-003, TASK-004, TASK-005) — cover service
   rules and both surfaces, including cascade delete and uniqueness.

## Planned ADRs

| Decision Area | Trigger Condition |
|---|---|
| Migration chain strategy: dependency-ordered, root-table-first, FKs inline, seed bundled with its schema revision (and the licence to rewrite a never-applied chain rather than patch append-only) | If confirmed at Reconcile as the house approach for this and all future inter-domain FKs |

## Constraints & Gotchas

- **API contract is LOCKED at v1.0.** The five project endpoints, their bodies, the
  `Project` shape, and the exact 409 message are fixed. Do not change shapes; do not add
  endpoints. The 409 message must be verbatim: "A project with this name already exists."
- **Cascade is a DB contract, not application logic.** Delete must remove all nested data
  (stories → tasks → attachments/versions/comments/links, project_settings) atomically via
  `ON DELETE CASCADE`. SQLite enforces foreign keys only when `PRAGMA foreign_keys=ON` —
  this is already required by the core DB engine setup; the migration and tests depend on
  it. Verify no partial state remains on delete.
- **DB-agnostic.** Code must run unchanged on SQLite (default, WAL) and PostgreSQL.
  Case-insensitive uniqueness and the UUID column type are dialect-aware inside the data
  layer only. No `batch_alter_table` is needed: the `project_settings → project` FK is
  declared inline in `0002_settings` and resolves because `project` is created first in
  `0001_project`.
- **Rewriting the migration chain is intentional and pre-approved.** The chain was never
  applied (the first PostgreSQL deployment failed before any migration ran), so there is no
  database or data to preserve. The three old revisions are deleted and replaced by
  `0001_project` + `0002_settings`. Any local SQLite dev volume must be wiped and re-migrated
  from empty — a code-free operational reset, not an in-place edit.
- **Service is the only home for logic.** REST controller and MCP tools must be thin and
  behavior-identical; all rules live in the project service.
- **No auth.** Projects have no ownership or access control — `*_role` fields elsewhere are
  descriptive metadata only; none apply to projects.
- **Description max length is 5000**; name is 1–200. Enforce in the service/schema layer.
