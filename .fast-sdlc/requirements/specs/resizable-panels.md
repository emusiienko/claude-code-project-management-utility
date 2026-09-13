# Resizable Panel Layouts

Traces to STORY-006. Confirmed with the user (2026-09-10): drag-to-resize is per-panel-pair (not a
single width shared across the app), applies to the project navigation sidebar in addition to every
list+detail split, and the readability floor/ceiling is a qualitative business rule — exact pixel or
percentage values are a technical decision, not specified here.

## Validation Rules

### Field-Level
N/A — this feature has no data fields; it is a Web UI interaction behavior, not a data-entry feature.

### Business-Level
1. Every layout in the Web UI that places two panels side by side — a navigation/list panel next to a
   content/detail panel — has a draggable border between the two panels. This includes, as of this
   writing: the project navigation sidebar beside the Task Manager content, the sessions navigation
   sidebar beside the Sessions content, and the task board beside the story detail's right-hand panel
   (description, attachments, comments) inside the Story Detail view — and applies to any such
   side-by-side layout the Web UI has today or adds later — the rule describes a class of layout, not
   a fixed list of screens.
2. Hovering the cursor over the border between two panels shows a resize affordance (the cursor
   changes to indicate the border can be dragged) before the user starts dragging, so the capability
   is discoverable without instructions.
3. Clicking and dragging the border changes the width of the panel(s) on either side of it, updating
   continuously as the cursor moves, and stops adjusting once the mouse button is released.
4. A resized width applies only to the panel pair the user resized. Resizing one panel pair (e.g. the
   task board/story-detail-panel split inside the Story Detail view) never changes the width of any
   other panel pair (e.g. the project navigation sidebar, or the sessions navigation sidebar) — each
   panel pair remembers its own width independently.
5. A resized width holds only for the current browser session. Reloading the page returns every panel
   pair to its default width. Navigating between views within the same session preserves each
   already-visited view's independently-resized width.
6. Dragging can never shrink the list/navigation panel to the point its content becomes unreadable,
   and can never shrink the detail/content panel to the point it becomes unreadable. The exact
   minimum and maximum widths that satisfy this are a technical decision, not specified here.

## Error Handling
| Scenario | User-Facing Outcome |
|----------|---------------------|
| User drags the border toward the panel's minimum readable width and keeps dragging further | The panel stops shrinking at that floor; the border stays at the floor position even if the cursor keeps moving past it |
| User drags the border toward the panel's maximum usable width and keeps dragging further | The panel stops growing at that ceiling; the border stays at the ceiling position even if the cursor keeps moving past it |
| The browser window is resized after a panel pair has been manually resized | Each panel pair keeps the user's chosen width for as long as the window has room for it; if the window becomes too narrow to honor both the chosen width and the readability floor, the panel pair falls back to its default sizing for that viewport rather than overlapping or hiding content |
| The viewport is too small for a side-by-side layout to make sense (e.g. a narrow/mobile-width screen) | The resize affordance is not offered, consistent with however that layout already adapts at small viewport widths (e.g. stacking or collapsing) |

## Usage Limits
N/A — no business-driven usage limit applies; this is a presentation-layer interaction with no cost
or subscription dimension.
