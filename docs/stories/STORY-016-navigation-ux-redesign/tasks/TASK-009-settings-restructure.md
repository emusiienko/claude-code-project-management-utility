---
status: Done
assignee: frontend-developer
story: STORY-016
---

# TASK-009: Settings restructure

## What to implement

Split the two Settings surfaces so system defaults stay global and project overrides move into the
project context.

- Global `/settings` (reached via the `⚙ Settings` top-bar button): remove the "Project Overrides"
  tab; the page now shows only system-level dictionary defaults.
- Project overrides: expose them at the `Settings` sub-nav tab, `/projects/:id/settings`, inside
  ProjectShell. Reuse the existing ProjectSettings component unchanged; preserve its current
  override / clear / save behaviour exactly as it is today.

This task relocates existing UI only. The known end-to-end clear-override gap (the frontend calls a
non-existent `DELETE /projects/:id/settings/:key`; no REST/MCP route exposes the service's
`clear_project_setting`) is explicitly OUT OF SCOPE — do not fix it here and do not change the API
contract. It requires a separate contract revision.

## Scope

Frontend Settings page restructuring and reuse of the existing ProjectSettings component. No backend,
no API contract changes.

## Dependencies

TASK-004

## Acceptance Criteria

- [ ] `/settings` shows only system-level dictionary defaults; the "Project Overrides" tab is removed
- [ ] `/projects/:id/settings` (Settings sub-nav tab) shows the project dictionary overrides
- [ ] The existing project override / clear / save behaviour is preserved unchanged
- [ ] No API contract change and no attempt to fix the clear-override gap

## Intended ADR

None.

---
## Implementation Report

**Date**: 2026-07-08

**What was done**:
- Removed the "Project Overrides" tab from `/settings`. `SettingsPage.tsx` now renders only `SystemSettings` with updated descriptive copy directing users to the project context for overrides.
- Exported `EffectiveSettingsPanel` from `ProjectSettings.tsx` (previously an unexported internal component). Added a JSDoc explaining the reason for the export.
- Created `ProjectSettingsPage.tsx` — the new entry point for `/projects/:projectId/settings`. It reads `projectId` from the route param (guaranteed by the router/ProjectShell) and renders `EffectiveSettingsPanel` directly with a heading and description.
- Replaced the `<Navigate to="../stories" replace />` placeholder in `router.tsx` with a lazy-loaded `ProjectSettingsPage`.

**Deviations from plan**:
None. The implementation matches the plan exactly — move UI only, no contract or API changes.

**Technical decisions made**:
- Exported `EffectiveSettingsPanel` rather than adding a prop to `ProjectSettings`. Adding a prop (e.g. `preselectedProjectId`) would have changed the existing component's interface and rendered the `ProjectSelector` panel unused in the new context. Exporting the sub-component keeps `ProjectSettings` fully unchanged in its tab context while enabling direct reuse in the project route.
- `ProjectSettingsPage` reads `projectId` as `useParams<{ projectId: string }>()` cast to `string`. ProjectShell already validates the project before any child renders, so the cast is safe and matches the pattern used in other leaf pages (StoriesPage, BoardPage).

**Code locations**:
- `frontend/src/features/settings/SettingsPage.tsx` — simplified to render only SystemSettings
- `frontend/src/features/settings/components/ProjectSettings.tsx` — `EffectiveSettingsPanel` exported
- `frontend/src/features/settings/ProjectSettingsPage.tsx` — new page (created)
- `frontend/src/app/router.tsx` — lazy import + route registration for `ProjectSettingsPage`

**Technical debt noted**:
None introduced. The known clear-override end-to-end gap (frontend calls `DELETE /projects/:id/settings/:key` but no REST route exposes it) is unchanged and documented in CLAUDE.md § Gotchas — out of scope per task spec.
