---
status: Done
assignee: frontend-developer
story: STORY-016
---

# TASK-008: Story Detail slide-over

## What to implement

Build the Story Detail slide-over as a nested child route of the Stories list at
`/projects/:id/stories/:storyId`, so the background list/board stays mounted and dimmed.

- The panel animates in from the right, covers the sidebar and sub-nav, and dims the background
  content behind it.
- Fixed header: a `← Stories` breadcrumb, the story title, a status badge, an `✏ Edit` button, and an
  `✕` close button.
- Main area: the task kanban with one column per task status. Since Task Management (STORY-005) is not
  yet implemented, render this as a placeholder kanban structure (columns present, no live task data)
  — do not fabricate task data or call task endpoints.
- Right panel: story description rendered as Markdown, an attachments list, and a comments list.
  Attachments and comments are not yet implemented (STORY-007/008) — render placeholder sections; do
  not call those endpoints. Description uses the story's existing detail data.
- The right panel toggles with a `‹` / `›` button; its open/closed state persists in browser local
  storage per story (keyed by story ID) via `useLocalStorage`.
- Closing via the `✕` button, the `Escape` key, or the `← Stories` breadcrumb navigates back to the
  parent route (Stories list or Board), unmounting the slide-over and restoring the previous URL. The
  breadcrumb specifically returns to the Stories list.
- Deep link: visiting `/projects/:id/stories/:storyId` directly renders the project view with the
  slide-over already open. A non-existent story renders the project view with an inline "Not found"
  message inside the slide-over area.

## Scope

Frontend Story Detail slide-over as a nested route. No backend, no API contract changes. Task kanban,
attachments, and comments are placeholders pending STORY-005/007/008.

## Dependencies

TASK-006

## Acceptance Criteria

- [ ] Clicking a story title or Board card opens a slide-over that animates in from the right, covers
      the sidebar and sub-nav, dims the background, and sets the URL to `/projects/:id/stories/:storyId`
- [ ] The slide-over header shows the `← Stories` breadcrumb, story title, status badge, `✏ Edit`
      button, and `✕` close button
- [ ] The main area shows a task kanban with one column per task status (placeholder — no live task
      data, no task endpoint calls)
- [ ] The right panel shows the story description as rendered Markdown plus placeholder attachments and
      comments sections
- [ ] The right panel toggles with `‹`/`›` and its open/closed state persists per story across reloads
- [ ] Closing via `✕`, `Escape`, or `← Stories` restores the previous URL; the breadcrumb returns to
      the Stories list
- [ ] Visiting `/projects/:id/stories/:storyId` directly renders the project view with the slide-over
      already open
- [ ] A non-existent `:storyId` renders the project view with an inline "Not found" message inside the
      slide-over area

## Intended ADR

None.

---
## Implementation Report

**Date**: 2026-07-08

**What was done**:
Three new components created and the router's `:storyId` child route wired to the slide-over:

- `StorySlideOver` — full slide-over panel rendered as the nested child route at `/projects/:projectId/stories/:storyId`. Manages backdrop, Escape-key listener, edit-modal state (delegates to existing `StoryModal`), loading/error/not-found states, and composes `TaskKanbanPlaceholder` + `StoryRightPanel`.
- `TaskKanbanPlaceholder` — renders one column per entry in the project's effective `task_statuses` dictionary (falls back to `["To Do", "In Progress", "Done"]` when empty). No task endpoint calls; each column shows an empty-state placeholder.
- `StoryRightPanel` — collapsible panel with story description (rendered via `react-markdown`), attachments placeholder, and comments placeholder. Toggle button lives on the left edge of the panel; parent persists open/closed state per story via `useLocalStorage`.

Router change: replaced `element: null` placeholder in the `:storyId` child route with the lazy-loaded `StorySlideOver`.

Tailwind config: added `keyframes.slide-in-from-right` + `animation.slide-in-from-right` to support the entry animation without introducing a new npm dependency (`tailwindcss-animate` is not installed).

**Deviations from plan**:
None. All acceptance criteria met as specified.

**Technical decisions made**:
- `@tailwindcss/typography` (prose plugin) is not installed — used Tailwind's arbitrary-property selector syntax (`[&_p]:mb-2` etc.) inside a wrapper div to style Markdown output. This avoids adding a new dependency.
- Slide-in animation added to `tailwind.config.ts` via `keyframes`/`animation` extension rather than `tailwindcss-animate` (not installed). A single custom keyframe is sufficient for this use case.
- `StorySlideOver` imports `useState` separately from other hooks because the component already uses the named `useLocalStorage` and the import order follows the conventions layer rule.

**Code locations**:
- `frontend/src/features/stories/components/StorySlideOver.tsx` — main slide-over component
- `frontend/src/features/stories/components/TaskKanbanPlaceholder.tsx` — task kanban placeholder
- `frontend/src/features/stories/components/StoryRightPanel.tsx` — collapsible right panel
- `frontend/src/app/router.tsx` — `:storyId` child route wired to `StorySlideOver`
- `frontend/tailwind.config.ts` — `slide-in-from-right` keyframe + animation token added

**Technical debt noted**:
- `TaskKanbanPlaceholder` uses `task_statuses` from the project's effective settings as the source of column names. When STORY-005 implements live task data, the component will need to be replaced with a real kanban that fetches tasks per status column.
- The `_storyId` parameter in `TaskKanbanPlaceholder` is intentionally unused and suppressed via eslint comment — remove the suppression when STORY-005 activates the parameter.
- `StoryRightPanel` has attachments and comments as static placeholders — these will need to be replaced with live queries in STORY-007 and STORY-008 respectively.
