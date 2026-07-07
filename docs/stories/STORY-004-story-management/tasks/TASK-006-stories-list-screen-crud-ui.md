---
status: Done
assignee: frontend-developer
story: STORY-004
---

# TASK-006: Stories list screen & CRUD UI

## What to implement
Build the Stories list view — a sub-view of a single project — plus its create/edit/delete UI,
mirroring the Projects screen's component decomposition (list / modal / form / delete-dialog).

**Routing & navigation:**
- Add a nested project sub-view route reached by clicking a project name in the Projects list. This
  is a sub-view of a project — it does **not** add a top-level nav entry (the 3-item nav rule holds).
- Make each project name in the Projects list a navigable link to its Stories view.

**Stories screen** (page-level orchestration only; filters live in page-level component state and
feed the list query key):
- A filter bar: status dropdown (sourced from the project's effective `story_statuses`) plus label
  key and label value text inputs.
- A stories table with columns for title, status badge, label chips, task aggregate, and per-row
  edit and delete icon buttons. The task aggregate shows "N/A" (tasks arrive in STORY-005) and the
  aggregate endpoint is never called.
- The story title is a clickable link that opens the edit modal — the same behavior as the row's
  edit icon button. (Confirmed UX: clicking the title edits the story in place; there is no separate
  story-detail route in this story.)
- A story modal wrapping a story form (title, content textarea, status dropdown, and the shared
  Labels editor) used for both create and edit. Do not surface the milestone field anywhere in the
  form or table.
- A delete confirmation dialog.
- An empty state with a "New story" call to action.
- Distinct, queryable UI for loading, error, and empty states per the conventions.

## Scope
`frontend/src/features/stories/` (page + feature-local components), routing registration, and the
project-name link in the existing Projects list.

## Dependencies
TASK-004, TASK-005

## Acceptance Criteria
- [ ] Stories view is a nested project sub-view; no new top-level nav entry is added.
- [ ] Clicking a project name in the Projects list navigates to that project's Stories view.
- [ ] Filter bar filters by status, label key, and label value; filters feed the list query key.
- [ ] Table shows title, status badge, label chips, "N/A" task aggregate, and edit/delete actions.
- [ ] Clicking the story title opens the edit modal (same as the edit icon).
- [ ] Create and edit use the same modal/form; the Labels editor is the shared component.
- [ ] The milestone field is never surfaced.
- [ ] Delete confirmation dialog is present; empty state shows a "New story" CTA.
- [ ] Loading, error, and empty states render distinct queryable UI.
- [ ] The aggregate endpoint is never called.

## Intended ADR
None.

---
## Implementation Report
**Date**: 2026-07-07
**What was done**:
- Added `/projects/:projectId` route to `router.tsx`, lazy-loaded, pointing to `StoriesPage`
- Wrapped each project name in `ProjectList.tsx` with a `<Link to={/projects/${project.id}}>` — only the name is linked; Edit/Delete actions are unchanged
- Implemented `StoriesPage.tsx` — page-level orchestration with filter bar (status dropdown + label key/value inputs, Apply/Clear), "New story" CTA, and modal state machine (none | create | edit | delete)
- Implemented `StoryList.tsx` — table with title (clickable → opens edit modal), status badge, label chips, "N/A" task aggregate, edit/delete icon buttons; distinct loading (PageLoader), error (role=alert), and empty states (with inline CTA)
- Implemented `StoryForm.tsx` — controlled form with title (required, ≤500), status dropdown (sourced from effective story_statuses), content textarea (Markdown, optional), and shared LabelsEditor; client-side validation on title
- Implemented `StoryModal.tsx` — wraps StoryForm in a `<dialog>` element; create vs edit mode based on presence of `story` prop; same pattern as ProjectModal
- Implemented `DeleteStoryDialog.tsx` — confirmation dialog same pattern as DeleteProjectDialog
- Created `utils/errorMessages.ts` — same utility as the one in projects; extracts user-readable message from ApiRequestError

**Deviations from plan**:
- Status is sent as `undefined` (not `null`) when the select is empty on create, which matches `CreateStory.status?: string` in the API contract. On edit, the same applies — no explicit `null` is sent for status because the API contract's `UpdateStory.status?: string` treats absence the same.
- Filter bar uses a two-step pattern (draft state + Apply button) rather than immediate onChange filtering, to avoid triggering a network request on every keystroke while typing label filters.

**Technical decisions made**:
- Story title in the table is a `<button>` (not an `<a>`) because clicking it opens a modal, not navigates — using `<a>` without an `href` would be semantically incorrect; `<button>` is the right semantic element for an action that doesn't navigate.
- `StatusBadge` and `LabelChip` are defined as local components inside `StoryList.tsx` — they are only used in that one file and have no reuse candidate elsewhere yet. Extracting them would add files without benefit.
- `useProjectSettingsEffective` is imported from `features/settings/hooks/` (cross-feature) — the hook is in the settings feature, not in shared/, but is consumed by stories. This is a minor layering concern; the correct resolution (moving to shared/) is deferred until a second consumer appears (STORY-012 task management may also need it).

**Code locations**:
- `frontend/src/features/stories/StoriesPage.tsx` — page orchestration
- `frontend/src/features/stories/components/StoryList.tsx` — story table
- `frontend/src/features/stories/components/StoryForm.tsx` — create/edit form
- `frontend/src/features/stories/components/StoryModal.tsx` — modal wrapper
- `frontend/src/features/stories/components/DeleteStoryDialog.tsx` — delete confirmation
- `frontend/src/features/stories/utils/errorMessages.ts` — error extraction utility
- `frontend/src/app/router.tsx` — added StoriesPage route at /projects/:projectId
- `frontend/src/features/projects/components/ProjectList.tsx` — added Link on project name

**Technical debt noted**:
- `useProjectSettingsEffective` is imported cross-feature (stories → settings). Should be moved to `shared/hooks/` once a second feature consumes it (e.g. STORY-005 tasks may need task_statuses). Tracked implicitly by the cross-feature import convention violation.
