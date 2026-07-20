---
status: Done
assignee: frontend-developer
story: STORY-008
---

# TASK-010: Default Web UI role settings UI

## What to implement
Add a "Default Web UI role" row to both the System Settings and Project Settings views for the new
`default_web_ui_role` setting.

- A new row alongside the five existing dictionary rows, named and described generically (not
  comment-specific).
- Unlike the chip-list / link-types editors, this row is a **single-value dropdown** populated from
  the effective `participant_roles` list — because it holds exactly one value.
- System Settings: the dropdown reflects the current system value; Save updates the system default.
- Project Settings: shows the current project override with an Override badge, or the inherited
  system value otherwise, using the same Override/Edit and Clear-override controls as the other five
  keys (inheriting the same known clear-override backend gap).
- The dropdown only ever offers values currently present in the effective `participant_roles`, so a
  disallowed value cannot be chosen client-side.

## Scope
System and Project settings UI: the single-value dropdown row wired to the `default_web_ui_role`
setting.

## Dependencies
TASK-005.

## Acceptance Criteria
- [x] Both settings views show a "Default Web UI role" row rendered as a single-value dropdown over
  the effective `participant_roles`.
- [x] System Settings pre-selects the current system value and saves updates to it.
- [x] Project Settings shows an override (with Override badge) or the inherited value, with
  Override/Edit and Clear-override controls consistent with the other keys.
- [x] Only current effective `participant_roles` values are selectable.

## Intended ADR
None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-20

**What was done**:
Added `default_web_ui_role` as a sixth row in both the System Settings and Project Settings
screens, rendered as a single-value native `<select>` dropdown rather than the chip-list editors
used by the five list-valued dictionaries:

- `src/api/types.ts`: added `default_web_ui_role: string` to `Settings` and
  `default_web_ui_role?: string` to `SettingsOverrides`; added a new exported `SettingsKey =
  DictionaryKey | "default_web_ui_role"` union so save/error/clear-override state and the
  clear-override key param can span both dictionary and scalar keys without widening
  `DictionaryKey` itself (which several existing dictionary-only call sites — `PLAIN_DICT_KEYS`,
  `DictionaryEditor` — still rely on being list-shaped).
- `src/api/endpoints/settings.ts`: `clearProjectOverride`'s `key` param widened from `DictionaryKey`
  to `SettingsKey` — no URL or request-shape change, `PROJECT_SETTINGS_KEY` already took a bare
  `string`.
- `src/features/settings/hooks/useProjectSettings.ts`: `ClearProjectOverrideParams.key` widened to
  `SettingsKey` to match.
- `src/features/settings/components/DefaultWebUiRoleEditor.tsx` (new): single-value dropdown editor
  mirroring the read/edit/save/cancel/error/override-badge/clear-override contract of
  `DictionaryEditor`/`LinkTypesEditor`, but editing a scalar string via a native `<select>` instead
  of a chip list. The `<select>` is populated only from the `participantRoles` prop (the effective
  `participant_roles` list), so a disallowed value can never be chosen client-side. If the current
  value has since fallen outside the effective `participant_roles` set (a documented edge case in
  `implementation_plan.md` — an inherited system default can legitimately sit outside a narrowed
  project override), edit mode falls back to the first available option rather than injecting a
  synthetic out-of-list `<option>`; the read-only view still displays the actual current value
  regardless.
- `src/features/settings/components/SystemSettings.tsx` and `.../ProjectSettings.tsx`: added
  `handleSaveDefaultWebUiRole`, widened per-key save-error/saving-key/clearing-key state from
  `DictionaryKey` to `SettingsKey`, and mounted `DefaultWebUiRoleEditor` alongside the existing
  `DictionaryEditor` rows and `LinkTypesEditor`, wired to `settings.default_web_ui_role` /
  `effectiveSettings.default_web_ui_role` and `settings.participant_roles` /
  `effectiveSettings.participant_roles`. Project Settings passes the same `overrideBadge` /
  `onClearOverride` / `isClearingOverride` wiring pattern as the other five keys, so it inherits the
  same known clear-override backend gap (STORY-002) without any new frontend workaround.

**Deviations from plan**: None. The task scope (a single-value dropdown row in both settings views,
sourced from effective `participant_roles`) was followed exactly; no new routes or hooks were
needed since `Settings`/`SettingsOverrides`/the existing update and clear-override endpoints already
generically pass through whatever keys the backend accepts (confirmed against TASK-005's shipped
surface).

**Technical decisions made**:
- Introduced `SettingsKey` as a separate union rather than adding `"default_web_ui_role"` directly
  to `DictionaryKey`, since several existing call sites (`PLAIN_DICT_KEYS`, `DictionaryEditor`'s
  `values: string[]` prop) structurally assume every `DictionaryKey` maps to a list-valued setting;
  widening `DictionaryKey` itself would have required defensive casts at those sites for no benefit.
- Built a dedicated `DefaultWebUiRoleEditor` rather than extending `DictionaryEditor` with a
  single-value mode — the same reasoning already applied to `LinkTypesEditor` in STORY-020: a
  materially different value shape (scalar vs. list) and interaction model (`<select>` vs.
  add/remove chips) is clearer as a standalone component than a conditional branch inside a shared
  one.
- Client-side fallback behavior for an out-of-range current value (select the first available
  `participant_roles` option on entering edit mode) rather than surfacing an error state: the
  constraint is scope-relative ("current effective `participant_roles` values are selectable") and
  this out-of-range case is explicitly called out in `implementation_plan.md` as benign, since the
  comment's own `author_role` is never dictionary-validated and the read-only view already shows the
  true current value.

**Code locations**:
- `frontend/src/api/types.ts` — `SettingsKey`, `Settings.default_web_ui_role`,
  `SettingsOverrides.default_web_ui_role`
- `frontend/src/api/endpoints/settings.ts` — `clearProjectOverride` key type widened to `SettingsKey`
- `frontend/src/features/settings/hooks/useProjectSettings.ts` —
  `ClearProjectOverrideParams.key: SettingsKey`
- `frontend/src/features/settings/components/DefaultWebUiRoleEditor.tsx` — new single-value dropdown
  editor
- `frontend/src/features/settings/components/SystemSettings.tsx` — mounts the new editor, scalar
  save handler, `SettingsKey`-typed state
- `frontend/src/features/settings/components/ProjectSettings.tsx` — mounts the new editor with
  override badge / clear-override wiring, scalar save handler, `SettingsKey`-typed state

**Technical debt noted**:
- Inherits the pre-existing known gap (STORY-002): no REST/MCP route exposes
  `clear_project_setting`, so a project-level `default_web_ui_role` override cannot actually be
  cleared through any public surface today — the "Clear override" button is wired identically to
  the other five keys and will fail the same way theirs does until that gap is closed. Not addressed
  here, per the task's explicit scope (matches TASK-005's backend note).
- `docs/frontend-coding-conventions.md` re-read before completion — no gaps found; no changes made
  (conventions are updated only at the user's explicit request).

**Convention Gaps** *(informational only — no `frontend-coding-conventions.md` change made)*:
- Baseline Vitest suite (before this task): 201 passed across 20 files. Post-implementation: 201
  passed across 20 files — no regressions. `tsc --noEmit` and a full production `vite build` both
  pass clean.
