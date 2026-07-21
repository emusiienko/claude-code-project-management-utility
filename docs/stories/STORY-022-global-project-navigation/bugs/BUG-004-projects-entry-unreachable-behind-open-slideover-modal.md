---
id: BUG-004
story: STORY-022
severity: major
status: resolved
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

## Fix

Root cause: the top bar `<header>` (`frontend/src/app/TopBar.tsx`) has no
`position` set (static), and CSS paints positioned elements — including any
`position: fixed` element, regardless of its own z-index value — after all
static elements within the same stacking context. Both the Story slide-over
and the Task Detail modal render their backdrop/panel with `fixed inset-0` /
`fixed inset-y-0` / `fixed inset-4`, i.e. `position: fixed` starting at the
true viewport top (`y=0`). Since the top bar is static, these fixed overlays
always paint above it and intercept the click regardless of any z-index the
header carried — explaining why `document.elementFromPoint()` resolved to the
overlay's own header, not the "Projects" link.

Fix, two parts:
1. `TopBar.tsx`: the header is now `relative` (a positioned element, so its
   z-index takes effect) with `z-[110]` — higher than every overlay z-index
   already in use in the app (Story slide-over `z-40`/`z-50`, Task Detail
   modal `z-[60]`/`z-[70]`, nested confirmation dialogs `z-[90]`, the Toast
   `z-[100]`). It also now has an explicit height (`h-12`, matching its prior
   rendered height) so overlays can offset against a known value.
2. `StorySlideOver.tsx` and `TaskDetailModal.tsx`: their backdrop/panel now
   start below the top bar (`top-12` for the slide-over and the Task Detail
   backdrop; `top-16` for the Task Detail panel, which also carries its own
   1rem margin) instead of at the true viewport top. This is needed in
   addition to (1) — raising only the top bar's z-index without this offset
   would make the (opaque) top bar visually clip the top of these two
   overlays' own headers, since both currently start their own header at
   `y=0`, the same position as the top bar.

Other, smaller centered dialogs in the app (`TaskModal`, `DeleteTaskDialog`,
`AttachmentViewerModal`, etc.) needed no changes — their panels are centered
(`top-1/2`, translated) rather than anchored to the viewport top, so they
don't visually collide with the top bar's header content; they incidentally
also become click-through-safe from part (1) alone, since the top bar now
paints above their backdrops too.

**Code locations**: `frontend/src/app/TopBar.tsx`,
`frontend/src/features/stories/components/StorySlideOver.tsx`,
`frontend/src/features/tasks/components/TaskDetailModal.tsx`

**Verification**: `tsc --noEmit` and `npm run build` pass; compiled CSS
confirms `.z-\[110\]{z-index:110}`, `.h-12{height:3rem}`, `.top-12{top:3rem}`,
and `.top-16{top:4rem}` are emitted. `npx vitest run` — 211 passed / 2 failed,
same 2 pre-existing failures as the baseline run before this fix (in
`TopBar.test.tsx`, caused by the parallel BUG-003 fix's test file not yet
being updated — unrelated to this change, no regressions introduced).

## Re-verification (qa-automation, 2026-07-21, post TASK-006/007/008)
`TopBar.tsx` was modified again by TASK-006 (global Config entry,
`TopBarNavLink` extraction) — confirmed the fix's markers survived intact:
`header` still carries `relative z-[110] h-12`; `StorySlideOver.tsx` panel/
backdrop still start at `top-12`; `TaskDetailModal.tsx` backdrop/panel still
start at `top-12`/`top-16`. Full frontend suite (`npx vitest run`) — 260/260
passing, including `TopBar.test.tsx`, `StorySlideOver.test.tsx`. Status →
`resolved`.
