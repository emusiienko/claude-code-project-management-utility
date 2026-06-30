---
status: Done
assignee: frontend-developer
story: STORY-002
---

# TASK-008: System & Project settings screens

## What to implement
Fill the Settings placeholder (from TASK-007) with two screens that consume the LOCKED v1.0 contract
through the shared API client. The UI may mirror server rules for UX but enforces nothing — the
server is authoritative.

- **System Settings screen** — view and edit the six global dictionaries
  (`task_statuses`, `task_types`, `story_statuses`, `attachment_types`, `link_types`,
  `participant_roles`). Saving a key sends only that key (or the provided subset) per the contract's
  `Partial<Settings>` body.
- **Project Settings screen** — for a selected project: view its **effective** values, set a per-key
  override, and clear an override back to the system default. Show which keys are overridden vs.
  falling through to the default.

UX niceties: disable save on an empty list (the server still rejects it with
"Dictionary values cannot be empty."); surface `400`/`404` via the shared error convention.

## Scope
`frontend/src/screens` (Settings screens) + `src/api` Settings calls. No routing/layout changes
beyond filling the existing Settings placeholder.

## Dependencies
TASK-007 (shell, routing, API client), TASK-004 (live Settings REST API)

## Acceptance Criteria
- [ ] System Settings screen lists all six dictionaries and can update any of them.
- [ ] Project Settings screen shows effective values, sets a per-key override, and clears an override
      back to default — each affecting only the targeted key.
- [ ] All data flows through the shared API client and the locked contract; no contract changes.
- [ ] Server errors (`400` empty/unknown key, `404` missing project) are surfaced to the user.
- [ ] No frontend-side enforcement of business rules — server remains authoritative.

## Intended ADR
None.

---
## Implementation Report

**Date**: 2026-06-30

**What was done**:
Implemented the Settings API layer and both Settings screens — System Settings and Project Settings — as two tabs under the existing `/settings` route.

1. `frontend/src/api/settings.ts` — replaced the TASK-007 stub with five exported hooks:
   - `useSystemSettings` — GET /v1/system/settings
   - `useUpdateSystemSettings` — PUT /v1/system/settings (Partial<Settings> body)
   - `useProjectSettings` — GET /v1/projects/:id/settings (stored overrides)
   - `useProjectSettingsEffective` — GET /v1/projects/:id/settings/effective
   - `useSetProjectOverride` — PUT /v1/projects/:id/settings
   - `useClearProjectOverride` — DELETE /v1/projects/:id/settings/:key
   All hooks use `queryKeys` from the existing factory. Mutation `onSuccess` invalidates the relevant queries.

2. `frontend/src/api/projects.ts` — created with `useProjectList` (GET /v1/projects?limit=100) needed by the project selector. STORY-003 will expand this file with CRUD mutations.

3. `frontend/src/screens/settings/DictionaryEditor.tsx` — shared inline editor component. Renders chip list, per-chip delete, add-value input (Enter or Add button), Save/Cancel controls. Save is disabled when the working list is empty. Accepts optional `overrideBadge` and `onClearOverride` props used by the Project Settings tab. Also exports `formatKeyLabel` utility.

4. `frontend/src/screens/settings/SystemSettings.tsx` — renders six DictionaryEditor instances in a 2-column responsive grid. Each save sends only the changed key as `Partial<Settings>`. Per-key error state and per-key saving state are tracked independently.

5. `frontend/src/screens/settings/ProjectSettings.tsx` — project selector (left panel) + effective settings editors (right panel). Overridden keys show an "Override" badge and a "Clear override" button. Uses `useProjectSettings` (overrides) to determine which keys are overridden, and `useProjectSettingsEffective` for the displayed values.

6. `frontend/src/screens/settings/index.tsx` — replaced the placeholder with a tab switcher (System Defaults / Project Overrides). Each tab panel renders lazily (mounted only when active) to avoid unnecessary requests.

**Deviations from plan**:
- The implementation plan listed the route change as "no routing/layout changes beyond filling the existing Settings placeholder". No routing changes were needed — the `/settings` route was already wired in TASK-007. The Project Settings is a tab inside the same screen, not a separate route. This matches the task scope description.
- `frontend/src/api/projects.ts` was created as a minimal stub (list only). The implementation plan did not mention this explicitly, but `projects.ts` is the correct domain file per the coding conventions ("every domain has one file in `src/api/`"). The stub is forward-compatible with STORY-003.

**Technical decisions made**:
- Per-key independent save state: each of the six dictionary keys has its own `isSaving` and `errorMessage` state rather than a shared one. This allows the user to save one key while another is still displaying an error, with no cross-key interference.
- Project selector uses local `useState` (not URL state). The project selection is transient UI state — it does not need to survive navigation or reload. URL-based project selection would require a nested route (`/settings/:projectId`), which would touch the router and fall outside the task scope.
- `DictionaryEditor` closes itself on `Cancel` but not automatically on save success. The parent controls saving lifecycle; the component stays open until the user explicitly cancels or navigates away. This avoids a race condition where the editor closes before TanStack Query has refreshed the cache.
- `useProjectList` fetches with `limit=100` — sufficient for a personal utility where the number of projects is expected to remain small. Pagination is not needed for this screen.

**Code locations**:
- `frontend/src/api/settings.ts` — all Settings TanStack Query hooks
- `frontend/src/api/projects.ts` — `useProjectList` stub
- `frontend/src/screens/settings/index.tsx` — tab-switcher entry screen
- `frontend/src/screens/settings/SystemSettings.tsx` — System Defaults tab
- `frontend/src/screens/settings/ProjectSettings.tsx` — Project Overrides tab (includes ProjectSelector + EffectiveSettingsPanel)
- `frontend/src/screens/settings/DictionaryEditor.tsx` — reusable dictionary editor + `formatKeyLabel` export

**Technical debt noted**:
- `frontend/src/api/projects.ts` exports only `useProjectList`. When STORY-003 (Project Management screen) is implemented, it should add `useCreateProject`, `useUpdateProject`, `useDeleteProject` in the same file without duplicating the list hook.
- The project selector in ProjectSettings does not support search/filter. For large project counts (unlikely in this tool's scope but possible) it would need a combobox or server-side filter.
