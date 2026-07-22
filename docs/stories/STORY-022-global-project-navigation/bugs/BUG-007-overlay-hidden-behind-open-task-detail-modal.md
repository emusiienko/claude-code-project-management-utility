---
id: BUG-007
story: STORY-022
severity: major
status: fixed
assignee: frontend-developer
---

# BUG-007: Projects/Config overlay panel opens successfully but renders invisibly behind an already-open Task Detail modal

## Description
TASK-009's state-driven overlay (`OverlayHost`) reuses the Story slide-over's
z-index convention verbatim: backdrop `z-40`, panel `z-50` ("z-indexing below
the top bar (see StorySlideOver)", per the component's own doc comment).
That convention was correct for the Story slide-over, which is only ever
opened from the Stories list and never needs to appear above a Task Detail
modal (a Task Detail modal only ever opens *from* an already-open Story
slide-over, never the reverse).

The new Projects/Config overlay is different: the story's whole premise is
that it must be reachable and usable "from anywhere," including from a state
where a Task Detail modal (`z-[70]`) is already the topmost open surface. In
that state, opening the Projects (or Config) overlay does correctly change
state — a `role="dialog"` element with the right content mounts in the DOM —
but its `z-50` is lower than the Task Detail modal's `z-[70]`, so it renders
completely hidden underneath the modal. The user sees no visible change at
all (aside from the top-bar trigger switching to its active/`aria-current`
styling), even though the panel did open.

## Steps to Reproduce
1. Navigate to a project's Stories view, open a story (Story slide-over
   appears, e.g. `z-50`), then open a task from within it (Task Detail modal
   appears on top, `z-[70]`).
2. Click the global "Projects" entry in the top bar.
3. Observe: the URL does not change (expected — overlays don't navigate),
   and the screen still shows only the Task Detail modal — no Projects panel
   is visible anywhere, no backdrop change is visible over the modal itself.
4. Inspect the DOM: a `role="dialog"` element with `aria-label="Projects"`
   is present, with `z-index: 50` computed — lower than the Task Detail
   modal's `z-index: 70` — confirming the panel is mounted but rendered
   underneath the modal, not that the click silently did nothing.
5. Repeat with the global "Config" entry instead of "Projects" — same result
   (`aria-label="Config"` dialog also mounts at `z-index: 50`, still hidden
   behind the `z-[70]` Task Detail modal).
6. For contrast: repeat steps 1–2 with only the Story slide-over open (no
   Task Detail modal) — in that case the Projects overlay renders correctly
   on top and is fully visible/usable, since the Story slide-over is also
   `z-50` and the overlay is inserted later in the DOM. The bug reproduces
   specifically once a Task Detail modal (`z-[70]`) is the topmost surface.

## Expected Result
The Projects/Config overlay should render above every other overlay
currently in the main view — Story slide-over, Task Detail modal, and any
nested confirmation dialogs — consistent with the story's premise that these
entries are reachable and usable "from anywhere," the same guarantee the
former top-bar `z-[110]` gave the Projects *link* under Revisions 1–2 (see
BUG-004). Opening Projects or Config while a Task Detail modal is open should
show the panel on top, fully visible and interactive, exactly as it already
does when only a Story slide-over is open underneath.

## Actual Result
The overlay panel mounts (confirmed via DOM inspection) but is rendered
completely hidden behind the Task Detail modal because its `z-50` (shared
with the backdrop's `z-40`) is lower than the Task Detail modal's `z-[70]`.
The user gets no visible feedback that anything happened beyond the top-bar
button's active-state styling change — clicking "Projects" or "Config" while
a Task Detail modal is open appears to silently do nothing.

## Additional Info
- Screenshots: `docs/qa/results/STORY-022-evidence/bug007-projects-overlay-hidden-behind-task-modal.png` and `docs/qa/results/STORY-022-evidence/bug007-config-overlay-hidden-behind-task-modal.png` (both show only the Task Detail modal on screen, with the top-bar trigger already in its active state, after opening the respective overlay).
- Confirmed via direct DOM inspection (`getComputedStyle(dialog).zIndex`) rather than relying on the screenshot alone: `test-2` (Story slide-over) `z: 50`, `task-1` (Task Detail modal) `z: 70`, `Projects`/`Config` (new overlay) `z: 50` in both cases.
- `frontend/src/app/OverlayHost.tsx`'s own doc comment states it copies "z-indexing below the top bar (see StorySlideOver)" — this was a reasonable starting point but doesn't account for the Task Detail modal's higher `z-[70]`, which the Story slide-over itself never needs to out-rank (a Task Detail modal only ever opens on top of an already-open Story slide-over, never independently).
- Escape's own stack ordering is unaffected by this bug: dispatching Escape while the Projects overlay is open behind the Task Detail modal correctly closes the (invisible) Projects overlay first, one level per press, leaving the Story slide-over and Task Detail modal open underneath exactly as `useModalEscape`'s registration-order design intends — confirmed by inspecting the `role="dialog"` list before/after. This is purely a visual (`z-index`) defect, not a functional stacking-order defect.
- Severity judgment: classified `major`, consistent with how BUG-004 (the direct predecessor of this exact reachability guarantee) was classified — it defeats the core premise of the whole story (Projects/Config reachable from any state) for a commonly-reached state (any open task), and gives no visible error or feedback, which is arguably more confusing than BUG-004's original symptom (at least there the click visibly failed to register at all).
