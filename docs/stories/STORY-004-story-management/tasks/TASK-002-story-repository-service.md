---
status: Done
assignee: backend-developer
story: STORY-004
---

# TASK-002: Story repository & service

## What to implement
Build the story repository and service, following the `projects` domain's repository/service/schema
separation.

**Repository** (extends the shared base repository):
- A single paginated-list query that optionally narrows by owning project, status, label key, and
  label value. Each filter narrows independently — a label value without a label key and vice-versa
  are both accepted.
- The JSON label predicate is **dialect-aware and fully contained in the repository**: on SQLite,
  test membership via the `json_each` table-valued function; on PostgreSQL, use `jsonb`
  containment/path operators. The service and controller see one interface (label-key / label-value
  arguments) and never touch SQL or dialect. Filtering by a label key no story carries returns an
  empty page, never an error.

**Schemas** (Pydantic, no `Body`/`Response` name suffixes):
- Field-level validation only: title non-empty and at most 500 characters; content at most 50000
  characters; each label requires a non-empty key. Violations fail as 422 before the service runs.
- Entry layers pass string identifiers straight through; schemas never parse UUIDs.

**Service** (all business rules):
- On create/update, resolve the owning project's **effective** `story_statuses` dictionary through
  the `EffectiveDictionary` Protocol already exposed by the settings package — never import the
  concrete settings service. A non-null status must be a member of that effective dictionary; a
  `null` status is always valid, including on update to remove a previously-set status.
- Status-violation error message is fixed: `Status value '{v}' is not allowed. Allowed: {comma-separated list}.`
  and returns 422.
- Parent-project existence is verified; a missing project returns 404.
- ID coercion is inherited from the base repository — a malformed project or story identifier
  surfaces as 404, not 422 (ADR-011). Add no per-service UUID parsing.
- Labels replace, never merge: providing a labels array replaces the entire set; omitting it leaves
  labels unchanged; providing an empty array clears all labels (valid). Treat the incoming list as
  the complete new set.

## Scope
`backend/app/stories/` (repository, service, schemas).

## Dependencies
TASK-001

## Acceptance Criteria
- [ ] Repository list query filters by project, status, label key, and label value, each independently.
- [ ] JSON label filtering works on both SQLite and PostgreSQL; no dialect-specific SQL leaks out of the repository.
- [ ] Filtering by an absent label key returns an empty page, not an error.
- [ ] Field-level validation (title, content, label key) fails as 422 before the service runs.
- [ ] Non-null status is validated against the effective `story_statuses` via the Protocol; null status always accepted.
- [ ] Status-violation error uses the exact fixed message format and returns 422.
- [ ] Missing parent project returns 404; malformed identifiers return 404.
- [ ] Label writes fully replace; empty array clears; omission leaves unchanged.

## Intended ADR
Dialect-aware JSON label filtering in the data layer — first JSON-array filter in the codebase,
reusable by tasks/comments; confirmed once the SQLite `json_each` / PostgreSQL `jsonb` split is
proven portable.

---
## Implementation Report

**Date**: 2026-07-07

**What was done**:
Created three files in `backend/app/stories/`: `repository.py`, `schema.py`, `service.py`.

- `repository.py` — `StoryRepository(BaseRepository[Story])` with: `coerce_project_id` (public helper for ADR-011 compliance); `get_by_id_and_project` (returns a story only if it belongs to the given project); `list_paginated` (optional filters: project_id, status, label_key, label_value). Label filtering is dialect-aware and fully private: `_apply_label_filter` dispatches to `_apply_label_filter_sqlite` (uses `json_each` + `json_extract` with EXISTS subquery) or `_apply_label_filter_postgresql` (uses `jsonb_array_elements` + `@>` containment with EXISTS subquery). Dialect is detected via `session.get_bind().dialect.name`.

- `schema.py` — `Label` (with `key` non-empty validator), `CreateStory`, `UpdateStory` (with `@field_validator` on title non-empty/≤500, content ≤50000, label key non-empty), `Story` (response schema, `from_attributes=True`), `PaginationMeta`.

- `service.py` — `StoryService` injected with `StoryRepository`, `ProjectRepository`, and `EffectiveDictionary` Protocol (imported from `settings.service`, never the concrete `SettingsService`). Methods: `create`, `get` (project-scoped), `get_by_id` (standalone, for REST GET /stories/:id), `list_paginated`, `update`, `delete`. `update` uses `model_fields_set` to distinguish explicit null from omission for `status` and `content`.

**Deviations from plan**:
- The plan stated `get_by_id(story_id, project_id)` as the repository interface. Added a separate `get_by_id` (standalone, inherited from `BaseRepository`) used by the service's `get_by_id` method — this is needed by the REST controller (`GET /stories/:id` does not have a project context in the path). The project-scoped variant is `get_by_id_and_project`.
- Added `coerce_project_id` as a public method on `StoryRepository` to let the service delegate UUID coercion to the data layer when building a new `Story` model (per ADR-011). This is a thin public wrapper over the inherited `_coerce_uuid` static method.
- `content` field on update uses `model_fields_set` (same as `status`) to allow explicit null-to-null clearing — more correct than the original plan which did not specify this.

**Technical decisions made**:
- Dialect detection via `self._session.get_bind().dialect.name` — the session was created with `sessionmaker(bind=engine, ...)` so `get_bind()` is reliable without opening a connection.
- PostgreSQL label filter uses `jsonb_array_elements(story.labels::jsonb)` with `@>` containment in an EXISTS subquery — this correctly finds any array element that contains the key/value fragment as a subset.
- SQLite label filter uses `json_each(story.labels)` with `json_extract(je.value, '$.key')` and `json_extract(je.value, '$.value')` in an EXISTS subquery.
- The `EffectiveDictionary` Protocol is imported from `app.settings.service` (the Protocol type only), which keeps the import boundary clean — only the structural type is coupled, not the concrete service class.

**Code locations**:
- `backend/app/stories/repository.py` — `StoryRepository`
- `backend/app/stories/schema.py` — `Label`, `CreateStory`, `UpdateStory`, `Story`, `PaginationMeta`
- `backend/app/stories/service.py` — `StoryService`

**Technical debt noted**:
- `session.get_bind()` is deprecated in SQLAlchemy 2.0 for sessions not bound to a single engine, but works correctly here because `sessionmaker(bind=engine)` is the wiring pattern. If the project ever migrates to multiple engines or async sessions, `_dialect_name` in `StoryRepository` will need updating. Noted as low risk given the single-engine architecture.
- 3 pre-existing test failures in `tests/test_settings.py` (unknown key returns 400 vs 422) — not introduced by this task.
