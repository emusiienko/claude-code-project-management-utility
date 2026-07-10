---
status: Done
assignee: frontend-developer
story: STORY-012
---

# TASK-003: Milestones tab — list + CRUD

## What to implement

Replace the Milestones placeholder at `/projects/:id/milestones` (rendered inside ProjectShell) with
the real Milestones tab.

- The tab is always present in the project sub-navigation regardless of whether milestones exist.
- List all milestones for the project, showing for each: name, a status badge (`Planned` / `Active`
  / `Finished` — capitalised for display from the lowercase wire value), story count, and a truncated
  description.
- When the project has no milestones, show an empty state inviting the user to create one.
- Create, edit (name + description only — the project is fixed), and delete milestones. Deleting a
  milestone must not delete its stories (the backend clears their assignment); reflect the updated
  story counts after mutations.
- Surface the backend name-conflict error (409) inline on the create/edit form.

## Scope

Frontend Milestones feature under the project sub-nav. Consumes the milestone REST endpoints. Status
controls (activate/finish) are TASK-004; this task covers list + CRUD only.

## Dependencies

TASK-002

## Acceptance Criteria

- [ ] Milestones tab always present in the project sub-nav
- [ ] List shows name, status badge, story count, and truncated description per milestone
- [ ] Empty state shown when the project has no milestones, inviting creation
- [ ] Create / edit (name + description) / delete work; name conflict (409) shown inline
- [ ] Deleting a milestone removes it without removing its stories

## Intended ADR

None.

---
## Implementation Report

**Date**: 2026-07-10

**What was done**:
Replaced the Milestones placeholder at `frontend/src/features/milestones/` with a full list + CRUD implementation:

- `api/endpoints/milestones.ts` — already existed (created by TASK-005/007 agent); confirmed all five CRUD + two lifecycle endpoints; no changes needed.
- `api/types.ts` — already updated to v1.2 (`project_id`, `status: MilestoneStatus`, separate `MilestoneStatus` type exported); confirmed correct.
- `api/paths.ts` — already had `MILESTONES`, `MILESTONE`, `MILESTONE_ACTIVATE`, `MILESTONE_FINISH`; no changes needed.
- `config/apiConfig.ts` — already had `PAGINATION.MILESTONES = 100` and `DATA_FRESHNESS.MILESTONES = 30 * 1000`; no changes needed.
- `features/milestones/utils/errorMessages.ts` — already created with correct content.
- `features/milestones/hooks/useMilestones.ts` — already created with full hook set (list + CRUD + activate + finish); confirmed correct.
- `features/milestones/components/MilestoneForm.tsx` — created: controlled form (name required, description optional), client-side validation, inline 409 error display.
- `features/milestones/components/MilestoneModal.tsx` — created: native `<dialog>` with backdrop click dismiss, create/edit mode distinction.
- `features/milestones/components/DeleteMilestoneDialog.tsx` — created: native `<dialog>`, communicates "stories lose assignment but are not deleted".
- `features/milestones/components/MilestoneList.tsx` — created: table with name / status badge / story count / truncated description; active-row visual distinction via `bg-brand-50/40`; `StatusBadge` component capitalises wire values; empty state with "create first" CTA.
- `MilestonesPage.tsx` — replaced placeholder with full page orchestrator; manages ModalState discriminated union; routes to create/edit/delete handlers.

**Deviations from plan**:
Several foundation files (endpoints, paths, apiConfig, hooks, utils) were already in place from parallel TASK-005 and TASK-007 agents. No conflict — those files were already correct for TASK-003's needs.

**Technical decisions made**:
- Active row highlight uses `bg-brand-50/40` (subtle) instead of a border; keeps the table layout stable while providing visible distinction.
- `StatusBadge` is a module-private component inside `MilestoneList.tsx`; it is used only within that file and has no other consumers in TASK-003's scope. If TASK-004 needs to reuse it, it can be extracted to `shared/` at that point.
- `useDeleteMilestone` in the hooks file does not accept a `projectId` parameter (invalidates `milestones.all()` instead of the project-scoped key); this is a minor over-invalidation but is safe. Could be scoped in a future cleanup if performance matters.

**Code locations**:
- `frontend/src/features/milestones/MilestonesPage.tsx`
- `frontend/src/features/milestones/components/MilestoneList.tsx`
- `frontend/src/features/milestones/components/MilestoneModal.tsx`
- `frontend/src/features/milestones/components/MilestoneForm.tsx`
- `frontend/src/features/milestones/components/DeleteMilestoneDialog.tsx`
- `frontend/src/features/milestones/hooks/useMilestones.ts` (pre-existing, confirmed correct)
- `frontend/src/features/milestones/utils/errorMessages.ts` (pre-existing, confirmed correct)
- `frontend/src/api/endpoints/milestones.ts` (pre-existing, confirmed correct)

**Technical debt noted**:
None for this task scope.
