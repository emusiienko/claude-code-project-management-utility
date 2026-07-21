---
id: BUG-004
story: STORY-022
severity: major
status: open
assignee: frontend-developer
---

# BUG-004: Global Projects top-bar entry is covered and unclickable while a Story slide-over or Task Detail modal is open

## Description
`description.md`'s edge cases state: "Navigating to Projects via the global
entry while a Story Detail slide-over or Task Detail modal is open behaves
like any other top-level navigation away from a project: the slide-over/modal
is dismissed and the URL updates to `/projects`." In practice, both the Story
slide-over and the Task Detail modal render as full-viewport overlays that
visually and structurally cover the persistent top bar, including the global
"Projects" entry — so it cannot be clicked (by mouse) while either is open.
This reproduces with the Story slide-over alone (no Task Detail modal needed).

A workaround exists (close the slide-over/modal first via its own X button or
Escape, then click "Projects"), so this does not block the app entirely — but
it means the specific behavior described in the edge case ("clicking Projects
dismisses the open slide-over/modal") cannot happen, because the entry is not
reachable to click in the first place.

## Steps to Reproduce
1. Navigate to a project's Stories view with at least one story that has at least one task (e.g. `/projects/02daf420-3c27-4b51-b0a0-67b65b741e9e/stories`).
2. Click a story to open its Story slide-over.
3. Attempt to click the "Projects" entry in the top bar.
4. Observe: the click does not land on the "Projects" link — `document.elementFromPoint()` at the link's on-screen coordinates resolves to an element inside the slide-over's own header (e.g. the story's status badge), not the "Projects" link.
5. Open a task from within the slide-over's kanban to stack the Task Detail modal on top — same result: the modal's own header covers the same coordinates.

## Expected Result
The "Projects" top-bar entry remains visible and clickable while a Story slide-over and/or Task Detail modal is open; clicking it navigates to `/projects` and dismisses both overlays.

## Actual Result
The Story slide-over (and, stacked on top of it, the Task Detail modal) renders as a full-viewport overlay that covers the top bar, including the "Projects" entry. A real mouse click at the entry's screen position lands on the overlay's own header content instead — the entry is not reachable without first manually closing the slide-over/modal.

## Additional Info
- Screenshots: `docs/qa/results/STORY-022-evidence/tc-007-slideover-covers-topbar.png` (slide-over alone covering the top bar) and `docs/qa/results/STORY-022-evidence/tc-007-task-modal-covers-topbar.png` (Task Detail modal stacked on top, also covering the top bar).
- Confirmed via `document.elementFromPoint()` at the "Projects" link's `getBoundingClientRect()` center — resolves to the slide-over/modal header, not the link, in both cases.
- The link is still present in the accessibility tree/DOM (not removed), it is purely a visual/pointer-event stacking issue.
- Found while executing tc-007 (`docs/stories/STORY-022-global-project-navigation/test-cases/tc-007-dismisses-open-slideover-and-modal.md`).
- Severity judgment call: classified `major` because it defeats an explicitly written acceptance edge case in a very commonly-reached app state (any time a story or task is open), even though a manual workaround (close the overlay first) exists. Re-triage to `minor` if the team considers the workaround sufficient.
