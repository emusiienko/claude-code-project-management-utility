---
status: Done
assignee: frontend-developer
story: STORY-012
---

# TASK-004: Milestone status controls + confirmation

## What to implement

Add lifecycle controls to the Milestones tab list.

- Each milestone row offers actions to activate it (→ `Active`) and to mark it finished (→
  `Finished`), driven by the milestone activate / finish action endpoints.
- Activating a milestone when another milestone in the same project is already `Active` shows a
  confirmation dialog naming the currently active milestone; on confirm, activate (the backend
  demotes the previous one to `Planned` atomically) and refresh the list so exactly one row shows
  `Active`. Cancel makes no change.
- A `Finished` milestone can be re-activated through the same confirmation flow.
- Visually distinguish the `Active` milestone row in the list.

## Scope

Frontend Milestones tab — status action controls and the confirmation dialog. Consumes the
activate / finish action endpoints built in TASK-002.

## Dependencies

TASK-003

## Acceptance Criteria

- [ ] Each milestone can be activated and finished from the tab
- [ ] Activating over an already-active milestone shows a confirmation naming the current active one;
      on confirm the previous milestone reverts to `Planned` and only one row is `Active`
- [ ] A `Finished` milestone can be re-activated via the same confirmation flow
- [ ] The `Active` milestone row is visually distinguished

## Intended ADR

None.

---
## Implementation Report

**Date**: 2026-07-10

**What was done**:
Added Activate and Finish status controls to each milestone row in the Milestones tab, together with
a confirmation dialog for the "activate over an already-active milestone" case.

- Created `ActivateMilestoneDialog` — a `<dialog>`-based confirmation that names the currently-active
  milestone ("X is currently Active and will be set back to Planned") before the user confirms.
- Updated `MilestoneList` to accept `onActivate`, `onFinish`, and `pendingStatusIds` props.
  Each row conditionally renders an Activate button (`Play` icon) when `status !== "active"` and
  a Finish button (`CircleCheck` icon) when `status !== "finished"`. The `pendingStatusIds` set
  disables both buttons while a mutation is in-flight for that specific row.
- Rewrote `MilestonesPage` to wire the new props: `handleActivate` looks up the current active
  milestone in the cached list; if one exists, it opens `ActivateMilestoneDialog`; otherwise it
  calls `runActivate` directly. `handleFinish` calls the mutation directly with no dialog.
  Inline error banner handles Finish errors (no modal is open during a Finish mutation).
- The `useActivateMilestone` and `useFinishMilestone` hooks existed from TASK-003 — reused without
  modification.

**Deviations from plan**: None.

**Technical decisions made**:
- Activate action from `finished` status uses the same code path as from `planned` — no special
  casing needed; the backend is idempotent and accepts any-status-to-active.
- `pendingStatusIds` tracks in-flight mutations per-row (a `Set<string>`) rather than a single
  `isPending` boolean, so multiple rows can be disabled independently if users act quickly.
- Finish errors surface via an inline banner above the list (no modal required) since Finish is
  a direct action with no pre-confirmation step.

**Code locations**:
- `frontend/src/features/milestones/components/ActivateMilestoneDialog.tsx` — new confirmation dialog
- `frontend/src/features/milestones/components/MilestoneList.tsx` — added status action buttons + new props
- `frontend/src/features/milestones/MilestonesPage.tsx` — wired activate/finish handlers + new modal state

**Technical debt noted**: None.
