# Implementation Plan: STORY-012 — Milestones

## Context

Milestones are the last domain in the backend model and the final project sub-nav tab still showing
a placeholder. A milestone is a lightweight, optional planning marker: stories may be assigned to one,
but the utility works entirely without them. This story stands up the full milestone domain slice
(backend REST + MCP + migration) and fills in the Milestones tab, milestone status controls, the
Board's active-milestone filter, and the per-story milestone assignment control.

The original v1.0 architecture modelled milestones as many-to-many with projects (a `milestone_project`
join, `project_ids[]` on the wire) and had no status. During feature design the user approved a
**contract revision to v1.2**: a milestone belongs to **exactly one project** and carries a
**lifecycle status** (`planned` → `active` → `finished`). This simplification matches the story's
actual requirements (a milestone belongs to one project; a project has at most one active milestone)
and removes the join table entirely. The v1.2 Milestones section of `docs/api-contract.md` is the
authoritative shape; it supersedes the LOCKED v1.0 milestone shape.

This story also resolves **ADR-013**: `story.milestone_id` has shipped since STORY-004 as an FK-less
column awaiting the `milestone` table. STORY-012's migration creates that table and finally adds the
deferred `story.milestone_id → milestone.id` FK (`ON DELETE SET NULL`).

## Technical Approach

**Backend — new domain slice following the established per-app pattern.** The `milestones` app gets
the full vertical slice used by projects and stories: ORM model, repository, service (all business
rules), Pydantic schemas, a REST controller, and mirrored MCP tools. Business logic lives only in the
service; controller and MCP tools are thin. String IDs pass straight through the entry layers and are
coerced inside the repository (ADR-011).

**Single-project ownership + name uniqueness.** A milestone has one `project_id` (validated to exist,
404 if missing). Name is unique case-insensitively within that project (409 on collision), using the
same dialect-aware `LOWER(name)` functional-uniqueness approach as project names. `project_id` is
immutable after create — `PUT` accepts only `name`/`description`.

**Lifecycle status with a server-owned, atomic "single active" invariant.** Status is `planned`
(default on create), `active`, or `finished`. The invariant "at most one active milestone per project"
is enforced by the **service inside the activate transaction**, not by a DB constraint: activating a
milestone reads the project's current active milestone (if any), demotes it to `planned`, and sets the
target to `active` — all in one transaction so the demote + promote are atomic and cannot leave two
active milestones. Both transitions are exposed as action endpoints (`POST /milestones/:id/activate`,
`POST /milestones/:id/finish`) and are idempotent (activating an already-active or finishing an
already-finished milestone is a no-op success). Activation is valid from any prior status, so a
`finished` milestone can be re-activated through the same path.

**Story assignment stays on the stories service.** Assigning/clearing a story's milestone is already
`PUT /stories/:id` with `milestone_id`. The stories service gains a cross-domain validation: when
`milestone_id` is non-null, the milestone must exist (404) and belong to the story's project (422).
This is the story-side counterpart of the milestone slice and is delivered as part of the backend work.

**Board filtering is a story-list query, not a new endpoint.** The Board filters client-side by calling
the existing story list with the active milestone's id: `GET /stories?project_id=…&milestone_id=…`.
This adds an optional `milestone_id` query parameter to the story list (v1.2), filtering on the
`story.milestone_id` column. The frontend discovers the active milestone by reading the project's
milestone list and picking the single row whose status is `active`.

**Migration — create `milestone`, resolve the deferred story FK.** One Alembic revision, chained after
the latest head, creates the `milestone` table (inline `project_id` FK toward the already-existing
`project`, per ADR-010's root-first inline-FK rule) with its indexes, then adds the previously-deferred
`story.milestone_id → milestone.id` FK (`ON DELETE SET NULL`). Because SQLite cannot
`ALTER TABLE ADD CONSTRAINT`, the FK addition uses `batch_alter_table` so it rebuilds the table
portably on SQLite while emitting a plain `ADD CONSTRAINT` on PostgreSQL. No seed data (milestones are
optional and user-created).

**Frontend — fill the Milestones tab and wire status/assignment/filter.** The Milestones tab lists a
project's milestones with a status badge, story count, and truncated description, and offers create /
edit / delete plus activate / finish controls, with a confirmation dialog when activating over an
already-active milestone. The Board reads the active milestone and, when present, filters to its
stories with a visible filter label and a "show all" toggle (toggle state persists per project until
navigation away). The Story Detail slide-over gains an inline milestone-assignment control populated
from the story's project milestones. Status labels are capitalised for display; the wire values stay
lowercase.

## Ordered Tasks

1. TASK-001: Milestone table migration + deferred story FK (backend-developer) — Alembic revision
   creating `milestone` (inline `project_id` FK, indexes) and adding the deferred
   `story.milestone_id → milestone.id` FK portably (`batch_alter_table` for SQLite).
2. TASK-002: Milestone domain slice — REST + MCP + story-assignment validation (backend-developer,
   depends on TASK-001) — model, repository, service (single-project ownership, name uniqueness,
   atomic activate/finish, delete-clears-story-links), schemas, controller, MCP tools; plus the
   stories-service milestone-assignment validation and the story-list `milestone_id` filter.
3. TASK-003: Milestones tab — list + CRUD (frontend-developer, depends on TASK-002) — the
   `/projects/:id/milestones` tab: list with status badge / story count / truncated description,
   empty state, create / edit / delete.
4. TASK-004: Milestone status controls + confirmation (frontend-developer, depends on TASK-003) —
   activate / finish actions, the "another milestone is active" confirmation dialog, and the active-row
   visual distinction.
5. TASK-005: Board active-milestone filter (frontend-developer, depends on TASK-002) — default the
   Board to the project's active milestone's stories, filter label, "show all" toggle persisted per
   project, and the filtered empty state.
6. TASK-006: Story milestone-assignment control (frontend-developer, depends on TASK-002) — inline
   set/clear control in the Story Detail slide-over, populated from the story's project milestones.
7. TASK-007: Story-form milestone field (frontend-developer, depends on TASK-002) — optional milestone
   selector on the story create/edit form, populated from the story's project milestones.
8. TASK-008: qa-automation — automated tests for the milestone domain (CRUD, uniqueness, lifecycle,
   single-active invariant), story assignment validation, and the Board filter behaviour.

## Planned ADRs

| Decision Area | Trigger Condition |
|---|---|
| Milestone model change: M:N project association (`milestone_project` join, no status) → single owning project + lifecycle status (`planned`/`active`/`finished`) | On acceptance — a hard-to-reverse, contract-breaking data-model change that supersedes the LOCKED v1.0 milestone shape; a new engineer must understand why the join table is gone and why milestones carry status. |
| "At most one active milestone per project" enforced by the service in the activate transaction rather than a DB constraint | On acceptance — a non-obvious concurrency/consistency decision (why no partial unique index / DB-level guard); documents that the invariant is application-owned and atomic within the transaction. |

## Constraints & Gotchas

- **The v1.2 contract supersedes LOCKED v1.0 for Milestones only.** Milestone belongs to one project
  (`project_id`, not `project_ids[]`) and has a `status`. Every other domain's contract is unchanged.
  Wire status values are **lowercase** (`planned`/`active`/`finished`); the UI capitalises for display.
- **`project_id` is immutable after create.** `PUT /milestones/:id` accepts only `name`/`description`.
- **Single-active is atomic and application-enforced.** Activate must demote the project's current
  active milestone and promote the target in one transaction. Do not add a DB unique constraint for
  this — a milestone may legitimately move `active → planned` and back, and the demote/promote pair
  must be atomic. Never claim an in-memory guard is sufficient; the transaction is the guarantee.
- **Both transitions are idempotent.** Activating an already-active or finishing an already-finished
  milestone returns success with no change. Activation is valid from any prior status (re-activating a
  `finished` milestone is allowed).
- **Delete clears, never deletes.** Deleting a milestone sets `milestone_id = null` on its assigned
  stories; no story is deleted. Deleting a project cascades to delete its milestones and clears
  `milestone_id` on that project's stories.
- **Story assignment cross-project rule.** Assigning `milestone_id` on a story: 404 if the milestone
  does not exist; 422 "This milestone does not belong to the story's project." if it belongs to a
  different project.
- **ADR-013 resolution is part of this story's migration.** The migration adds the deferred
  `story.milestone_id` FK. On SQLite this needs `batch_alter_table` (table rebuild); it must remain
  portable so PostgreSQL gets a plain `ADD CONSTRAINT`.
- **Board filter uses the existing story list, not a new endpoint.** The Board issues
  `GET /stories?project_id=…&milestone_id=…`; the "show all" toggle simply drops the `milestone_id`
  param. Toggle state persists per project until the user navigates away from the Board.
- **No status transition rules beyond the invariant.** The utility stores facts and does not enforce
  process — there is no forbidden transition to reject (any status can move to any other via the two
  action endpoints), only the single-active invariant to maintain.
