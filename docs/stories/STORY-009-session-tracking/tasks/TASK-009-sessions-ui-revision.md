---
status: Done
assignee: frontend-developer
story: STORY-009
---

# TASK-009: Sessions UI — independent links + status enum

## What to implement
Bring the Sessions UI in line with both Revision 2 amendments. Both changes edit the same set of
session components, so they land together in one task. Use the existing TASK-005 hooks for all data
access; no new endpoints are involved.

**Amendment 1 — two independent links.** The session record has always carried two independent fields,
`linked_story_id` and `linked_task_id`, either/both/neither of which may be set. The UI currently
presents a single mutually-exclusive none/story/task selector and an either/or display; rework it so:
- The create form and the detail edit form each expose a story-link control and a task-link control that
  can both hold a value at the same time (a story link and a task link on one session is valid). The
  task-link control keeps its two-step "pick the task's story, then the task" shape, since tasks are
  story-scoped and there is no project-wide task list endpoint — that story choice is the task picker's
  own scaffolding and must not overwrite or clear the independent story-link field.
- The list and the detail view render a linked-story indicator and a linked-task indicator separately,
  each clickable and navigating to that item's own detail view in Task Manager. Both show together when
  both are set; each shows alone when only one is set.
- Clearing one link leaves the other untouched.

**Amendment 2 — status enum replaces `is_complete` + free-form status.**
- Contract types: `Session.status` becomes the required, non-null three-value enum
  (`pending` / `in-progress` / `finished`); remove `is_complete` from `Session`. `CreateSession` has no
  `status` field. `UpdateSession.status` is the optional-to-omit enum value (non-clearable); remove
  `is_complete` from `UpdateSession`.
- List: merge the former separate "status" column and "completion" badge into one status chip driven
  directly by `status`, showing the three states distinctly.
- Detail: replace the "Mark complete / Mark incomplete" toggle with a three-way status control offering
  `pending` / `in-progress` / `finished`, settable to any value at any time in any direction (each
  selection is an update of `status` alone). The status chip in the detail header reflects the same
  three states.
- Create form and detail edit form: remove the free-text status input entirely. Creation never sets
  status (every session starts `pending`); status is changed only through the detail status control.
- The "incomplete only" list filter is unchanged on the wire (`incomplete=true`); its label/meaning is
  "pending or in-progress".

Surface server validation messages inline as today (participant_role not allowed, topic/goal length,
and now an out-of-set status if one is ever sent).

## Scope
`frontend/src/features/sessions/` (SessionListPage, SessionDetailPage, SessionForm, SessionEditForm,
SessionList, LinkedItemSelector, LinkedItemDisplay, and any small helpers) and
`frontend/src/api/types.ts` (Session / CreateSession / UpdateSession).

## Dependencies
TASK-008 (the backend must return the new `status` shape and stop returning `is_complete`).

## Acceptance Criteria
- [ ] The create form and detail edit form let a story link and a task link be set independently, both
      at once, and cleared independently; setting a task link does not clear the story link and vice
      versa.
- [ ] The list and detail views show the linked story and linked task as two separate clickable
      indicators, each navigating to that item's own detail view.
- [ ] The list shows a single status chip reflecting `pending` / `in-progress` / `finished`; there is no
      separate completion badge.
- [ ] The detail view offers a three-way status control settable to any of the three values in any
      direction, and shows no complete/incomplete toggle.
- [ ] Neither the create form nor the edit form contains a free-text status field.
- [ ] The contract types carry the `status` enum and no `is_complete`; the build (tsc) and the frontend
      test suite pass.

## Intended ADR
None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-29

**What was done**:
- **Amendment 1 (independent links).** Deleted the mutually-exclusive none/story/task
  `LinkedItemSelector`. It is replaced by two fully independent controls — `StoryLinkField` (a single
  project-scoped story `<select>`, reads/writes only `linked_story_id`) and `TaskLinkField` (the
  existing two-step "task's story, then task" picker, reads/writes only `linked_task_id`, still
  resolving an already-linked task's owning story via `useTask` for edit-mode pre-selection). Both are
  now rendered together (not behind a radio choice) in `SessionForm` (create) and `SessionEditForm`
  (detail edit); selecting/clearing one never touches the other's state or payload field.
  `LinkedItemDisplay.tsx` was rewritten from a single either/or `LinkedItemDisplay` component into two
  exports, `LinkedStoryIndicator` and `LinkedTaskIndicator`, each independently null-safe ("None" when
  unset). `SessionList` now renders two separate table columns ("Linked story" / "Linked task") instead
  of one combined "Linked" column, and `SessionDetailPage` renders two separate `<dl>` rows instead of
  one "Linked story/task" row — matching the spec's "shown separately" wording; both indicators appear
  together whenever both are set.
- **Amendment 2 (status enum).** `Session.status` is now the required `SessionStatus` union
  (`"pending" | "in-progress" | "finished"`), `is_complete` removed from `Session`; `CreateSession` no
  longer has a `status` field at all; `UpdateSession.status` is now `SessionStatus | undefined` (no
  longer clearable, no longer `is_complete`). `SessionForm` (create) has no status input of any kind.
  `SessionEditForm`'s free-text status input was removed entirely (`SessionEditPayload` is now
  `Omit<UpdateSession, "status">`); the three-way status control lives outside the edit form, in
  `SessionDetailPage`'s action row, as the new `SessionStatusControl` component (a `<select>` offering
  all three values, firing an isolated `{ status }`-only update on every change — replacing the former
  `handleToggleComplete` boolean toggle). `SessionList`'s former separate free-text "Status" column and
  boolean "Completion" badge column were merged into one "Status" column rendering the new
  `SessionStatusBadge` (also used in `SessionDetailPage`'s header, replacing `CompletionBadge`).
  `SessionStatusBadge.tsx` exports `SESSION_STATUS_LABELS`, reused by `SessionStatusControl` — mirrors
  the existing `STATUS_LABELS`/`STATUS_BADGE_CLASSES`/`StatusBadge` pattern already used for
  `MilestoneStatus` in `MilestoneList`/`MilestoneDetailPage`.
- Updated JSDoc/comments in `api/types.ts`, `api/endpoints/sessions.ts`, and
  `features/sessions/hooks/useSessions.ts` that referenced `is_complete` or the free-form status/single
  either-or link model, so no comment in the touched files still describes the retired shape.

**Deviations from plan**: None — implemented exactly as scoped by the task and the architect's
Revision 2 plan. Kept `LinkedItemDisplay.tsx` as the filename for the two link-indicator components
(rather than renaming the file) since they are tightly-coupled presentational twins sharing style
constants, consistent with how the pre-existing file already grouped a wrapper and its two internal
link-rendering helpers.

**Technical decisions made**:
- Split the link selector into two standalone components (`StoryLinkField`/`TaskLinkField`) rather
  than parameterizing the old `LinkedItemSelector` with a mode prop — this was the real bug being
  fixed (mutual exclusivity baked into shared component state), so a structural split was the direct
  fix rather than a patch.
- The three-way status control was placed in `SessionDetailPage`'s action row (firing its own isolated
  mutation), not inside `SessionEditForm`, mirroring exactly where the old complete/incomplete toggle
  lived — `status` changes stay a one-field, immediate mutation independent of the rest of the edit
  form's multi-field submit, per the spec's "settable to any value at any time in any direction,
  independent of other fields" language.
- Reused the `MilestoneStatus`/`StatusBadge` visual pattern (label map + Tailwind class map + a small
  badge component) for `SessionStatusBadge` rather than inventing a new visual language for session
  status chips.

**Code locations**:
- `frontend/src/api/types.ts` — `SessionStatus` type added; `Session.status` now `SessionStatus`,
  `is_complete` removed; `CreateSession.status` removed; `UpdateSession.status` now `SessionStatus`.
- `frontend/src/api/endpoints/sessions.ts` — JSDoc updated (no `is_complete` mentions remain).
- `frontend/src/features/sessions/components/StoryLinkField.tsx` — new.
- `frontend/src/features/sessions/components/TaskLinkField.tsx` — new.
- `frontend/src/features/sessions/components/LinkedItemSelector.tsx` — deleted.
- `frontend/src/features/sessions/components/LinkedItemDisplay.tsx` — rewritten:
  `LinkedStoryIndicator`/`LinkedTaskIndicator`.
- `frontend/src/features/sessions/components/SessionStatusBadge.tsx` — new.
- `frontend/src/features/sessions/components/SessionStatusControl.tsx` — new.
- `frontend/src/features/sessions/components/SessionForm.tsx` — status input removed; two independent
  link fields.
- `frontend/src/features/sessions/components/SessionEditForm.tsx` — status input removed
  (`SessionEditPayload = Omit<UpdateSession, "status">`); two independent link fields.
- `frontend/src/features/sessions/components/SessionList.tsx` — "Linked story"/"Linked task" columns;
  single status chip column replaces the old status-text + completion-badge columns.
- `frontend/src/features/sessions/SessionDetailPage.tsx` — `SessionStatusBadge` in header,
  `SessionStatusControl` in the action row (replacing the complete/incomplete toggle), two independent
  "Linked story"/"Linked task" `<dl>` rows.
- `frontend/src/features/sessions/SessionListPage.tsx` — "Incomplete only" filter label given a
  clarifying `title` ("Pending or in-progress"); no functional change (wire filter unchanged).
- `frontend/src/features/sessions/hooks/useSessions.ts` — JSDoc updated.
- `CLAUDE.md` — Code Map entry for `frontend/src/features/sessions/` rewritten to describe the
  post-TASK-009 shape.

**Technical debt noted**:
- No automated frontend test suite exists yet for this feature (project has `tsc`/`vite build` only,
  no Jest/Vitest configured) — verified via `npm run build` (baseline green before changes, green after)
  per the Testing Guidance in `docs/frontend-coding-conventions.md`; manual/QA verification of the
  status control and independent-links UI is left to manual-qa / qa-automation.
- `SessionStatusBadge`/`SessionStatusControl` duplicate the existing `MilestoneList`/
  `MilestoneDetailPage` `StatusBadge` pattern rather than extracting a shared generic status-badge
  primitive to `shared/components/` — flagged as a Convention Gap below since the codebase now has two
  independent copies of the same label-map/class-map/badge shape (Milestones, Sessions); not fixed here
  since extracting it is a cross-feature refactor outside this task's scope.

**Convention Gaps**: The `STATUS_LABELS`/`STATUS_BADGE_CLASSES`/`StatusBadge` shape is now duplicated
three times in the codebase (`MilestoneList`, `MilestoneDetailPage`, and the new
`SessionStatusBadge`/`SessionStatusControl` pair) with no shared primitive. Worth a future
`shared/components/StatusBadge.tsx` generic (label map + class map as props) if a fourth enum-status UI
appears — left to the user's discretion per the Conventions Policy (updated only at explicit request).
