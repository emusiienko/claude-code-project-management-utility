# Implementation Plan: STORY-002 — Settings

## Context

Settings are the **vocabulary foundation** of the whole utility. Every dictionary-validated field
across Stories, Tasks, Task Links, and Attachments resolves against the six dictionaries this story
introduces (`task_statuses`, `task_types`, `story_statuses`, `attachment_types`, `link_types`,
`participant_roles`). Per `docs/technical_roadmap.md`, STORY-002 is the head of the critical path
(Settings → Project → Story → Task) and is the **first feature story implemented**.

A second, decisive fact shapes this plan: **no `backend/` code exists yet.** STORY-001 produced only
the architecture, conventions, and strategy documents — not the running skeleton. The roadmap's
"Foundational prerequisite (before any feature story)" therefore has to be built *as part of this
story*, because Settings is the first domain to need it and the architecture requires every file to
belong to exactly one task. The foundation is built once here as a thin, domain-agnostic scaffold so
STORY-003+ only ever add a new app package — they never touch the scaffold again.

This story spans four active roles: **backend-developer** (scaffold + Settings domain + MCP tools),
**devops** (Compose stack so the scaffold actually runs and migrations apply), **frontend-developer**
(SPA foundation + System and Project settings screens), and **qa-automation** (endpoint/behavior
coverage). The API contract for Settings is already defined and **LOCKED at v1.0** — this story
implements it exactly; it does not extend it.

Just as the backend skeleton has no prior code to build on, **no `frontend/` code exists yet either.**
STORY-001 produced only documentation. The React SPA foundation therefore has to be stood up as part
of this story, for the same reason the backend scaffold is: Settings is the first feature to need a
screen, and the architecture requires every file to belong to exactly one task. The frontend
foundation is built once here as a domain-agnostic shell — scaffold, routing, API client, layout, and
empty placeholder screens for **every** main application area — so STORY-003+ only ever fill in a
placeholder screen; they never re-establish the shell.

## Technical Approach

### Backend foundation (built once, reused by every later story)

The app-based modular monolith from the architecture is stood up as a skeleton:

- **`core`** provides the cross-cutting machinery: typed configuration (the single reader of the
  environment, including the `DATABASE_URL` dialect switch), the SQLAlchemy engine + session factory
  with SQLite WAL enablement, the portable UUID and JSON type abstractions, the base repository, the
  centralized domain-error classes and their mapping to the standard error envelope, and the
  effective-dictionary resolution helper.
- **`container`** is the single global DI composition root; **`api`** composes the FastAPI app under a
  `/v1` prefix and registers the error handler and CORS; **`mcp`** composes the MCP server mounted on
  a path of the same app/port. For this story `api` and `mcp` wire only the Settings providers; later
  stories register their own providers in the same container.
- **Alembic** is initialized with a portable baseline. The Settings tables and the system-defaults
  seed are delivered as migrations (schema and data seed are separate revisions, per conventions).

The dialect-specific concerns (UUID representation, JSON storage/filtering, case-insensitive
uniqueness, WAL) are isolated inside `core` so no service ever contains dialect logic. Settings itself
uses none of the JSON-label filtering or name-uniqueness machinery, but those abstractions are
introduced here because the scaffold is shared and the next stories depend on them; keeping them in
the foundation avoids a second, conflicting introduction later.

### Settings domain

Two persisted concepts and one derived concept:

- **System settings** — one row per dictionary key, each holding a non-empty list of allowed values.
  Seeded at install with the defaults in the architecture. Readable as a whole; updatable per key.
- **Project settings (overrides)** — at most one row per `(project, key)`. A present row **fully
  replaces** the system default for that key (replace semantics, never merge). Absent rows fall
  through to the system default. A project with no override rows is fully functional on defaults —
  no configuration step is required before use.
- **Effective settings** — derived on demand, never stored: for each of the six keys, take the
  project override if a row exists, otherwise the system default. This is the single resolution rule
  that the future Story/Task/Link/Attachment services will call before any dictionary-bound write.

The Settings service is the single home of all rules:

- **Key validation** — only the six known dictionary keys are accepted; any other key in a write body
  is a `400 VALIDATION_ERROR`.
- **Non-empty rule** — an empty list for any key is rejected with `400` and the exact message
  "Dictionary values cannot be empty."
- **Value-list normalization** — values are stored as provided after shape validation (non-empty
  strings); duplicate/whitespace handling is a service concern, kept identical for system and project
  writes so both surfaces behave the same.
- **Project existence** — every project-scoped read or write first asserts the project exists;
  a missing project is `404 NOT_FOUND`. Clearing an override for one key must leave the other keys'
  overrides untouched.
- **Isolation** — a write to one project's overrides, or to system settings, must never change
  another project's *stored* overrides (their *effective* values may legitimately change when a system
  default changes and they have no override for that key — that is the intended fall-through).

The dictionary-key names live as constants in `core` (DRY single source of truth); neither schemas
nor the service spell them as inline strings.

### Frontend foundation (built once, reused by every later story)

The screen-based React 19 + Vite SPA from the architecture is stood up as a shell, mirroring the
backend-scaffold philosophy:

- **Scaffold** — the Vite + React 19 project, TypeScript, and the build/dev configuration so the app
  compiles and serves.
- **Routing** — a single route table mapping each main application area to a route, with the layout
  shell (top-level navigation / tabs and a content outlet) that all screens render inside.
- **API client** — one configured client (base URL from environment, the `{ data, error }` envelope
  unwrapping, and a shared error-surfacing convention) that every future screen consumes; no
  per-screen ad-hoc fetching.
- **Placeholder screens** — an empty screen for **every** main application area the product will have
  (Projects, Stories, Tasks, Task Links, Attachments, Comments, Sessions, Milestones, Cross-project
  view, and Settings), each reachable from the navigation and rendering a minimal "coming soon"
  state. This makes the navigation complete from day one; STORY-003+ replace a placeholder with the
  real screen rather than touching routing or layout.

The shell is domain-agnostic. It contains no Settings logic — the Settings screens (next task) fill
in the Settings placeholder against the locked contract.

### Surfaces

- **REST** controller exposes exactly the Settings endpoints in the locked contract:
  `GET`/`PUT /system/settings`, `GET /projects/:id/settings`, `GET /projects/:id/settings/effective`,
  `PUT /projects/:id/settings`. Clearing a single override is expressed within the project-settings
  `PUT` semantics as defined by the contract (a key can be reset to the system default); the service
  exposes the clear-one-key operation that the controller and MCP tool both call.
- **MCP** tools mirror the same operations over the shared service — one logic path, two surfaces —
  per the roadmap's "tools track their service" strategy. Settings is the first domain to prove the
  REST+MCP shared-service pattern end to end.
- **Frontend** fills the Settings placeholder with two screens that consume the contract only: a
  **System Settings** screen (view and edit the six global dictionaries) and a **Project Settings**
  screen (view a project's effective values, set an override per key, and clear an override back to
  the system default). The UI mirrors server rules for UX (e.g. disabling save on an empty list) but
  enforces nothing — the server is authoritative.

### DevOps

The Compose stack is brought up so the scaffold and migrations actually run: the `backend` service
(REST + MCP on one port), the `web` service (nginx + the React build), and the optional PostgreSQL
profile selected by `DATABASE_URL`. `deploy.sh` wraps build → migrate → up. `.env.example` documents
every variable the backend config declares. This is the first time the stack runs, so it is scoped
here; later stories add no infrastructure.

## Ordered Tasks

1. **TASK-001 (backend-developer): Backend scaffold & core foundation** — app-based skeleton, `core`
   (config/env + `DATABASE_URL` switch, DB engine/session + WAL, portable UUID/JSON types, base
   repository, centralized errors + envelope, dictionary-key constants, effective-dictionary resolver
   helper signature), `container` DI composition root, `api` (FastAPI app, `/v1`, error handler, CORS)
   and `mcp` (server mounted on the shared path) composition shells, and the Alembic environment with
   a portable baseline. No domain logic yet.

2. **TASK-002 (backend-developer): Settings persistence & migrations** (depends on TASK-001) —
   `system_settings` and `project_settings` tables/models and their repository; one schema migration
   plus a separate data-seed migration loading the six system defaults from the architecture.

3. **TASK-003 (backend-developer): Settings service & effective resolution** (depends on TASK-002) —
   all business rules: key validation, non-empty rule with the exact message, replace-not-merge
   override semantics, clear-one-key, project-existence checks, cross-project isolation, and the
   effective-settings resolution used by future domains.

4. **TASK-004 (backend-developer): Settings REST controller** (depends on TASK-003) — the four
   contract endpoints wired through the container, returning the standard envelopes and mapping domain
   errors to `400`/`404` per the contract.

5. **TASK-005 (backend-developer): Settings MCP tools** (depends on TASK-003) — MCP tools mirroring the
   same operations over the shared service, identical behavior and error codes to REST. May proceed in
   parallel with TASK-004 once the service exists.

6. **TASK-006 (devops): Local Compose stack & migration run** (depends on TASK-001; verifiable after
   TASK-002) — `backend` + `web` + optional Postgres profile, `deploy.sh` (build → migrate → up),
   `.env.example`, so the scaffold and seed migration run on a clean machine.

7. **TASK-007 (frontend-developer): Frontend SPA foundation & placeholder screens** (no code
   dependency on backend tasks; may proceed in parallel) — Vite + React 19 scaffold, routing and
   layout shell, configured API client, and an empty placeholder screen for every main application
   area (Projects, Stories, Tasks, Task Links, Attachments, Comments, Sessions, Milestones,
   Cross-project view, Settings). Domain-agnostic; no Settings logic.

8. **TASK-008 (frontend-developer): System & Project settings screens** (depends on TASK-007 for the
   shell, and on TASK-004 for the live API) — the two screens that fill the Settings placeholder,
   consuming the locked contract: view/edit global dictionaries; view effective values, set a per-key
   override, and clear an override back to the default.

9. **TASK-009 (qa-automation): Automated tests for Settings** (depends on TASK-004 and TASK-005) —
   endpoint, behavior, and edge-case coverage against the running application, including REST/MCP
   behavioral equivalence.

## Planned ADRs

ADR files are created in Reconcile, not now. Decisions likely to warrant a record once implementation
confirms them:

| Decision Area | Trigger Condition |
|---|---|
| Effective-settings resolution model (override fully replaces, never merges; derived, never stored) | Confirmed as the canonical rule every dictionary-bound domain will call — recorded so STORY-004/005/006/007 implementors do not re-derive merge semantics. |
| System-defaults seeding via a dedicated Alembic data migration (separate from schema) | If the seed is implemented as a data migration rather than runtime bootstrap — fixes how defaults arrive on a fresh install. |
| Settings as the reference implementation of the REST + MCP shared-service pattern | If the shared-service wiring established here becomes the template every later domain follows. |

## Constraints & Gotchas

- **Foundation is built once, here.** TASK-001 is a shared scaffold, not Settings-specific. Keep it
  domain-agnostic so STORY-003+ only add an app package. Do not fold Settings logic into `core`.
- **API contract is LOCKED v1.0.** Implement the four Settings endpoints exactly as written; do not
  add, rename, or reshape endpoints or payloads. The contract's `PUT /projects/:id/settings` returns
  the **effective** settings after the update; `GET /projects/:id/settings` returns only the stored
  overrides (`{}` when none).
- **Replace, never merge.** A project override for a key wholly supersedes the system default for that
  key. Setting an override for one key must not touch other keys; clearing one key's override must not
  touch others.
- **Empty list is the one hard validation.** The exact user-facing message is
  "Dictionary values cannot be empty." — match it verbatim (it is asserted in acceptance criteria).
- **Unknown keys are `400`, not `422`.** Dictionary *value* violations elsewhere are `422`, but an
  unknown *settings key* in a write body is a request-shape error → `400 VALIDATION_ERROR`.
- **Non-existent project → `404`** on both `GET .../settings`, `GET .../settings/effective`, and
  `PUT .../settings`.
- **No process enforcement.** Settings stores allowed vocabularies; it never validates other domains'
  data here. The validation *callers* (Story/Task/etc. services) live in later stories; this story
  only exposes the resolver they will use.
- **No auth anywhere** — consistent with the whole project. `participant_roles` is descriptive
  metadata, not an access-control list.
- **DB-agnostic.** All dialect specifics stay inside `core`; the seed migration and the two settings
  tables must run unchanged on both SQLite (WAL) and PostgreSQL.
- **STORY-001 not yet Arch-reconciled** is expected — it produced docs only and is not a code
  dependency for this story.
