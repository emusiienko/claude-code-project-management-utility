---
status: Done
assignee: backend-developer
story: STORY-008
---

# TASK-005: default_web_ui_role setting and operator seed

## What to implement
Add a new single-value setting, `default_web_ui_role`, to the existing settings store, and update
the settings seed for a clean install.

- **Scalar setting in the shared store.** Reuse the existing `(key, values)` row mechanism, the
  system-default + project-override resolution, and the clear-override path (which continues to
  inherit the known REST/MCP clear-override gap — do not close it here). The value is a single
  string, stored uniformly in the existing JSON `values` column and exposed as a scalar on the
  settings request/response surface. It appears in the effective-settings payload alongside the
  five dictionaries.
- **Validation on write.** The value must be non-empty and a member of the effective
  `participant_roles` for the scope being written: system `participant_roles` for a system write;
  the project's effective `participant_roles` for a project override. The value is not re-validated
  on read, and it never constrains a comment's own free-form `author_role`.
- **Surface.** Add `default_web_ui_role` to the settings update body and to the effective-settings
  and system/project-overrides responses; mirror it in the settings MCP tools. No new routes.
- **Seed (clean install).** Edit the settings seed migration in place to (a) add `"operator"` to
  the system `participant_roles` default and (b) seed the system `default_web_ui_role` row as
  `"operator"`. The migration chain is re-run as a clean install (pre-production DB); no backfill of
  project-level overrides.

## Scope
Settings domain (schema, service, controller, MCP tools) and the settings seed migration. This task
is independent of the comments domain.

## Dependencies
None.

## Acceptance Criteria
- [x] A fresh clean install seeds `participant_roles` including `"operator"` and a system
  `default_web_ui_role` of `"operator"`.
- [x] `default_web_ui_role` is returned in the effective settings and in system/project overrides,
  and is settable via the settings update body and the settings MCP tools.
- [x] Setting `default_web_ui_role` to a value outside the effective `participant_roles` is rejected
  with the dictionary-value error message; a valid value is accepted.
- [x] Setting a system value validates against system `participant_roles`; setting a project
  override validates against that project's effective `participant_roles`.
- [x] `"operator"` is selectable anywhere `participant_roles` is used (e.g. a task's role fields),
  as an ordinary dictionary entry.

## Intended ADR
None directly (the scalar-setting and operator-role decisions are recorded as Planned ADRs in the
implementation plan; ADR files created at Reconcile).

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-20

**What was done**:
Added `default_web_ui_role` as a sixth, scalar settings key alongside the five existing dictionaries,
reusing the same `(key, values)` row mechanism, the same system-default + project-override
resolution, and the same (still-open) clear-override gap:
- `schema.py`: new `KEY_DEFAULT_WEB_UI_ROLE` constant, `ALL_SCALAR_KEYS` / `ALL_SETTINGS_KEYS`
  frozensets (kept separate from `ALL_DICT_KEYS` so existing dictionary-only call sites are
  unaffected), renamed `validate_dict_key` → `validate_settings_key` (now validates against the
  full six-key space). `UpdateSettingsBody` gained an optional `default_web_ui_role: str | None`
  field with a field-level non-empty validator; `reject_unknown_keys` now accepts all six keys.
  `SettingsResponse` (required) and `SettingsOverridesResponse` (optional) both gained
  `default_web_ui_role: str`.
- `model.py`: widened the `values` column's Python-side type hint from `Mapped[list[Any]]` to
  `Mapped[Any]` on both `SystemSettings` and `ProjectSettings` — the physical JSON column already
  stored heterogeneous shapes (plain string list vs. structured `link_types` objects); the scalar
  setting stores a bare string in the same column.
- `service.py`: `update_system_settings` / `update_project_settings` each gained a post-loop block
  that validates (non-empty already enforced by Pydantic; membership in the effective
  `participant_roles` for that scope enforced here via a new `_validate_default_web_ui_role`
  helper, raising `UnprocessableError` — 422 — with the same "Value '{v}' is not allowed. Allowed:
  {list}." message format used by every other dictionary-value violation in the codebase) then
  upserts the `SystemSettings`/`ProjectSettings` row. `resolve_all` now also resolves
  `default_web_ui_role` (override-then-system-default, same precedence as the five dictionaries).
  `clear_project_setting` and `get_system_settings`/`get_project_settings` needed no changes — they
  already operate generically over whatever rows exist for a given key.
- `mcp_tools.py`: docstrings updated to describe the new scalar key and its validation rule; tool
  bodies unchanged (they already delegate everything to the service).
- `migrations/versions/0002_settings.py`: edited in place (system confirmed pre-production, chain
  re-run as a clean install, per task instruction) — added `"operator"` to the seeded
  `participant_roles` list and added a new seed row `{"key": "default_web_ui_role", "values":
  "operator"}` (a bare JSON string, not a list — the only row in the table shaped that way).

**Deviations from plan**: None. The task's scope (schema/service/controller/MCP + seed migration,
no new routes) was followed exactly; the controller needed zero changes since both settings routes
already round-trip whatever `SettingsResponse`/`SettingsOverridesResponse` produce.

**Technical decisions made**:
- Kept `default_web_ui_role` out of `ALL_DICT_KEYS` and introduced `ALL_SCALAR_KEYS` /
  `ALL_SETTINGS_KEYS` instead of just adding it to the existing dictionary set — it is not a
  dictionary (no membership-list semantics of its own, single value not a set), and several
  existing call sites iterate `ALL_DICT_KEYS` expecting list-shaped values (`resolve_all`'s
  dictionary loop, dictionary-editor-style UI). This keeps those call sites correct without a
  runtime type check, and gives a later story a ready-made place (`ALL_SCALAR_KEYS`) to add a
  second scalar setting without re-touching the dictionary set.
- Renamed `validate_dict_key` → `validate_settings_key` (only internal caller: `clear_project_setting`)
  since it now validates a broader "settings key" space, not just dictionary keys.
- Used `UnprocessableError` (422) for the "value not in effective `participant_roles`" violation,
  matching the established convention in `tasks/service.py`, `stories/service.py`,
  `task_links/service.py`, and `story_links/service.py` for dictionary-value violations — even
  though other `ValidationError` (400) uses already existed in `settings/service.py` for a
  different class of violation (structurally empty dictionary values). The acceptance criteria's
  "dictionary-value error message" phrasing and the story's edge-case wording ("Value '{v}' is not
  allowed. Allowed: {list}.") both point at the 422 convention used everywhere else this exact
  message shape appears.
- Widened `values: Mapped[list[Any]]` → `Mapped[Any]` on both settings ORM models rather than
  introducing a separate table/column for the scalar setting — the column was already
  heterogeneous in practice (link_types stores a list of dicts, the four plain dictionaries store a
  list of strings); this is a Python-side type-hint correction, not a schema/DDL change, and no
  migration was needed for it.
- Validated a project-level `default_web_ui_role` write against that project's *effective*
  `participant_roles` (`self.resolve(project_id, DICT_KEY_PARTICIPANT_ROLES)`), not the system
  default — per the task/plan, an inherited system default can legitimately sit outside a project's
  narrowed override set, and this is benign since a comment's own `author_role` is never
  dictionary-validated.

**Code locations**:
- `backend/app/settings/schema.py` — `KEY_DEFAULT_WEB_UI_ROLE`, `ALL_SCALAR_KEYS`,
  `ALL_SETTINGS_KEYS`, `validate_settings_key`, `UpdateSettingsBody.default_web_ui_role` +
  validator, `SettingsResponse.default_web_ui_role`, `SettingsOverridesResponse.default_web_ui_role`
- `backend/app/settings/model.py` — `SystemSettings.values` / `ProjectSettings.values` type hint
  widened to `Mapped[Any]`
- `backend/app/settings/service.py` — scalar-setting blocks in `update_system_settings` /
  `update_project_settings`, `_validate_default_web_ui_role`, `_system_participant_roles`,
  `resolve_all` scalar-key resolution, `_validate_key` now calls `validate_settings_key`
- `backend/app/settings/mcp_tools.py` — docstring updates only (`get_system_settings`,
  `set_system_settings`, `get_project_effective_settings`, `set_project_settings`,
  `clear_project_setting`), plus a new module-level shape note for `default_web_ui_role`
- `backend/migrations/versions/0002_settings.py` — `"operator"` added to the seeded
  `participant_roles` list; new `default_web_ui_role` seed row

**Technical debt noted**:
- This task inherits the pre-existing known gap (STORY-002): no REST/MCP route exposes
  `clear_project_setting`, so a project-level `default_web_ui_role` override cannot be cleared
  through any public surface today, same as the five dictionaries. Not closed here, per the task's
  explicit instruction.
- `docs/backend-coding-conventions.md` re-read before completion — no gaps found; the
  `Convention Gaps` note below is about pre-existing test assumptions, not a conventions gap.

**Convention Gaps** *(informational — no `backend-coding-conventions.md` change made; per policy,
conventions are only updated at the user's explicit request)*:
- Baseline full backend suite (before this task): 442 passed, 2 xfailed. Post-implementation: 436
  passed, 2 xfailed, 6 failed — all six failures are in `tests/test_settings.py` and are the direct,
  expected consequence of this task's spec-mandated seed/response changes, not regressions:
  `test_seed_values_match_expected_defaults`, `test_partial_update_changes_only_specified_key`,
  `test_no_overrides_returns_system_defaults`, `test_override_replaces_system_default`,
  `test_returns_effective_settings_after_update` (all assert the old 8-entry `participant_roles`
  seed, now 9 with `"operator"`), and
  `test_system_settings_get_returns_exactly_five_keys` (asserts exactly five settings keys, now
  six). `docs/stories/STORY-008-comments/tasks/index.md` lists TASK-011 (qa-automation, depends on
  TASK-001–005) to update this coverage for the new setting; no test files were modified by this
  task per role ownership. Verified the full end-to-end behavior (seed values, system/project write
  validation with both invalid and valid values, empty-value rejection, project-scoped effective
  `participant_roles` validation, and the retired `attachment_types` 422) via a throwaway
  verification script run against the real FastAPI app + Alembic-migrated SQLite DB (not committed
  to the repo).
