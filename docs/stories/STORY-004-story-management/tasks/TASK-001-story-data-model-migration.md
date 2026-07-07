---
status: Done
assignee: backend-developer
story: STORY-004
---

# TASK-001: Story data model & migration

## What to implement
Add the `stories` domain to the backend with its ORM model and a new migration, following the
`projects` domain as prior art.

Define the Story entity carrying: identifier, owning project reference, title, content, status,
labels (a JSON array of key/value objects), milestone reference, and created/updated timestamps.
The shape is already fixed in `docs/architecture.md` and the LOCKED API contract — match it exactly.

Author one new Alembic revision that is appended to the tail of the existing dependency-ordered
chain (its down-revision is the current head, `0002_settings`). The revision:
- Creates the story table with an **inline** foreign key to the project table with cascade-delete
  behavior (valid because the project table already exists earlier in the chain).
- Creates the indexes the schema specifies: one on (project reference, created-at descending), one
  on (project reference, status), and one on the milestone reference.
- Adds the milestone reference as a plain nullable column **without** any foreign-key constraint —
  the milestone table does not exist yet (arrives in STORY-012), so under the root-first inline-FK
  strategy this column cannot yet point at a parent. STORY-012 adds the constraint later.
- Seeds nothing (stories have no seed data).
- Is written dialect-portably so the same revision runs unchanged on both SQLite and PostgreSQL,
  matching the UUID-as-string DDL style of the existing revisions.

## Scope
`backend/app/stories/` (new domain package — model only in this task), `backend/migrations/`.

## Dependencies
None

## Acceptance Criteria
- [ ] Story ORM model exists with all contract fields and correct nullability.
- [ ] New migration creates the story table with an inline cascade-delete FK to project.
- [ ] The three specified indexes are created.
- [ ] `milestone_id` exists as a nullable column with no FK constraint.
- [ ] Migration down-revision is `0002_settings`; chain remains append-only and root-first.
- [ ] `alembic upgrade head` succeeds on both SQLite and PostgreSQL from an empty database.

## Intended ADR
Deferred milestone FK on `story.milestone_id` — column without constraint until STORY-012 creates
the milestone table. Documents why the root-first chain (ADR-010) cannot add the FK yet.

---
## Implementation Report

**Date**: 2026-07-07

**What was done**:
- Created `backend/app/stories/__init__.py` — new domain package marker
- Created `backend/app/stories/model.py` — `Story` ORM model with all contract fields: `id` (UUIDType PK), `project_id` (UUIDType FK → project CASCADE DELETE), `title` (String(500)), `content` (Text nullable), `status` (String(100) nullable), `labels` (JSON default list), `milestone_id` (UUIDType nullable, no FK constraint), `created_at` / `updated_at` (DateTime timezone-aware)
- Created `backend/migrations/versions/0003_story.py` — Alembic revision with `down_revision = "0002_settings"`, creates story table with inline FK to project, three indexes (`ix_story_project_created_at`, `ix_story_project_status`, `ix_story_milestone_id`), no seed data
- Updated `backend/migrations/env.py` — registered `Story` model so Alembic autogenerate detects it
- Updated `CLAUDE.md` Code Map with new entries for `backend/app/stories/` and the updated `backend/migrations/` line

**Deviations from plan**:
None. Implementation matches the plan exactly.

**Technical decisions made**:
- `milestone_id` uses `UUIDType` in the ORM model (consistent with all other UUID columns) but the migration DDL uses `String(36)` — this is intentional: the dialect abstraction lives in the ORM layer, not in DDL. Both dialects accept `String(36)` for UUID storage.
- Added the WHY comment on `milestone_id` directly in `model.py` referencing ADR-010 and STORY-012 — the non-obvious absence of a FK constraint needs an explanation at the definition site.
- The `ix_story_project_created_at` index uses `sa.text("created_at DESC")` inside the column list for the descending sort — this is the standard SQLAlchemy/Alembic DDL approach for functional indexes, same pattern used in `ix_project_name_lower`.

**Code locations**:
- `backend/app/stories/model.py` — Story ORM model
- `backend/app/stories/__init__.py` — package marker
- `backend/migrations/versions/0003_story.py` — Alembic migration
- `backend/migrations/env.py` — Story model import added

**Technical debt noted**:
- Pre-existing test failures (3 tests in `test_settings.py` for `unknown_key_returns_400`) were present before this task and are unrelated to story management. Not introduced by this task.
