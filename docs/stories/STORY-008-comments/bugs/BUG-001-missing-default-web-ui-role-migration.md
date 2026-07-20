---
id: BUG-001
story: STORY-008
severity: critical
status: fixed
assignee: backend-developer
---

# BUG-001: Missing data migration for `default_web_ui_role` / `operator` seed breaks System Settings and the comment author-role pre-fill on pre-existing databases

## Description

STORY-008 introduces a new `default_web_ui_role` system setting and adds `"operator"` to the `participant_roles` seed list. Migration `0002_settings.py` was edited **in place** to add this seed data, on the stated assumption that the environment would always be a clean install. On a database that already existed before this change (i.e. one where `0002_settings` had already run), Alembic does not re-run the edited revision, so:

- No `default_web_ui_role` row is ever created in `system_settings` (or `project_settings`).
- `"operator"` is never added to the existing `participant_roles` row.

This causes:
1. `GET /v1/system/settings` to throw an unhandled `KeyError: 'default_web_ui_role'` in `SettingsResponse.from_dict`, returning `500 Internal Server Error`.
2. The System Settings web screen (`/settings`) to fail to load **any** of its five dictionary rows — not just the new one — showing "Failed to load system settings: An unexpected error occurred. Please try again."
3. The effective `default_web_ui_role` value resolving to an empty string for every project on this database, so the Add Comment form's `author_role` field is not pre-filled (and does not reset to a default after a successful submit) — contrary to the acceptance criteria.
4. `"operator"` never appearing as a selectable `participant_roles` value anywhere it's consumed (Default Web UI role dropdown, Task assignee/creator role, mention combobox, etc.) on this database.

I confirmed via the effective-settings endpoint and Project Settings screen that once a valid `default_web_ui_role` value **is** set (e.g. via a project-level override), the pre-fill mechanism itself works correctly — this narrows the root cause specifically to the missing migration/seed data for pre-existing databases, not a broader feature defect.

## Steps to Reproduce
1. Use a database that was created/migrated before the STORY-008 `0002_settings.py` edit (i.e. any environment that isn't a from-scratch install run after this story's migrations were written).
2. Navigate to `http://localhost:3000/settings` (System Settings).
3. Observe the page.
4. Separately, open any story/task/milestone's Comments section and observe the Add Comment form's `author_role` field.

## Expected Result
- System Settings loads all five (now six, per STORY-008 spec... actually now includes Default Web UI role as a sixth row) dictionary rows without error, with Default Web UI role pre-selected to `"operator"`.
- `participant_roles` includes `"operator"` out of the box.
- The Add Comment form's `author_role` field is pre-filled with the effective default Web UI role.

## Actual Result
- `GET /v1/system/settings` → `500 Internal Server Error` (`KeyError: 'default_web_ui_role'`).
- `/settings` shows a full-page error alert; no dictionary rows render at all.
- `participant_roles` for this database lacks `"operator"`.
- `default_web_ui_role` resolves to `""`; the Add Comment form's `author_role` starts empty and resets to empty (not to a default) after a successful submit.

## Additional Info
Backend log excerpt:
```
File "/app/backend/app/settings/schema.py", line 168, in from_dict
    default_web_ui_role=data[KEY_DEFAULT_WEB_UI_ROLE],
                        ~~~~^^^^^^^^^^^^^^^^^^^^^^^^^
KeyError: 'default_web_ui_role'
INFO:     172.26.0.1 - "GET /v1/system/settings HTTP/1.1" 500 Internal Server Error
```
DB inspection (`system_settings` table on the affected database) confirms only 5 rows exist (`task_statuses`, `task_types`, `story_statuses`, `participant_roles`, `link_types`) with `participant_roles` missing `"operator"`, and no `default_web_ui_role` row at all.

This affects test cases tc-004 (author_role pre-fill/reset), tc-018 (System Settings dropdown — page crashes), tc-019 (partially — override save works once a value exists, but the "before overriding, shows inherited system value" case can't be exercised), and tc-020 (`operator` not selectable anywhere, since it isn't in the dictionary).

Suggested fix direction (for the assignee to confirm): add a proper additive Alembic migration (in the style of `0008_link_types_structured` or `0010_attachment_title`) that backfills `default_web_ui_role` and adds `"operator"` to any existing `participant_roles` rows, rather than relying on `0002_settings.py` being re-run from scratch. Also consider making `SettingsResponse.from_dict` resilient to a missing key (e.g. default to `""`) so a partially-migrated database degrades gracefully instead of 500ing.

## Fix Applied

Added `backend/migrations/versions/0012_default_web_ui_role_backfill.py`, a new additive, idempotent, data-only migration (in the style of `0008_link_types_structured`) chained after `0011_comment`:
- If the system `participant_roles` row exists and lacks `"operator"`, appends it (no-op if already present).
- If the system `default_web_ui_role` row is missing, inserts it seeded to `"operator"` (no-op if already present).
- Scoped to system-level defaults only, per TASK-005's original decision not to touch project-level overrides (a project that already overrode `participant_roles` made a deliberate scoping choice; no project can have a pre-existing `default_web_ui_role` override since the setting did not exist before this story).
- Downgrade is the exact inverse: removes `"operator"` from system `participant_roles` (if present) and deletes the system `default_web_ui_role` row (if present).

This runs unconditionally on every environment — both a database that already had `0002_settings` applied before the STORY-008 edit landed (the reported repro) and a fresh clean install (where it is a guaranteed no-op since `0002_settings.py`'s current seed already includes both). Alembic always applies every un-run revision id in the chain regardless of a prior partial/edited state, which is exactly the guarantee `0002_settings.py`'s in-place edit lacked.

Also hardened `SettingsResponse.from_dict` (`backend/app/settings/schema.py`) per the suggested direction: `default_web_ui_role` now reads via `data.get(KEY_DEFAULT_WEB_UI_ROLE, "")` instead of `data[KEY_DEFAULT_WEB_UI_ROLE]`, so `GET /v1/system/settings` degrades to an empty string instead of a `500 KeyError` if the row is ever absent for any other reason (defense in depth — the migration is the actual fix; this is a belt-and-suspenders guard, matching the existing defensive-coercion pattern already used for `link_types` legacy rows in the same file).

**Verification**: ran the real `upgrade()`/`downgrade()` functions against a disposable SQLite database migrated to `0011_comment`, then manually stripped `"operator"` from `participant_roles` and deleted the `default_web_ui_role` row to reproduce the exact pre-existing-DB state described in this bug — confirmed the migration backfills both correctly, is idempotent when re-applied against an already-seeded state, and downgrades cleanly. Full backend suite: 517 passed, 2 xfailed (same baseline as before the fix — no regressions).

**Note for QA re-verification**: this fix targets the underlying migration/seed data. Re-running Check Story — Execute against a *fresh* database will not reproduce the original bug (a fresh install was never affected); the meaningful regression check is against a database that predates this fix, or by inspecting that `0012_default_web_ui_role_backfill` is present and applied.
