---
id: BUG-004
story: STORY-009
severity: major
status: resolved
assignee: frontend-developer
---

# BUG-004: Sessions list — a single session with a long unbroken topic value breaks the whole table's layout, hiding every column for every row

## Description
TC-002 (`tc-002-sessions-list-visual`) and TC-017 (`tc-017-long-content-and-session-volume`) both
require that a long topic value stay within its own row's container without breaking the row or
the list. Instead, when a session's `topic` is one long unbroken string (no spaces), the browser
sizes the Topic column to fit that string's full width, which stretches the *entire* `<table>`
element to match — not just the affected row. Since the whole table now measures ~5000px wide
inside a 1222px-wide scroll container, every other row's Participant / Linked story / Linked task
/ Created / Status / Actions columns are pushed off past the visible area for the *entire list*,
not only the row containing the long value.

This is a different, more severe symptom than BUG-002 (which covers the Session **Detail** view
overflowing the whole page for a long unbroken `context`/`status` value — that bug's own notes
confirm the list view was unaffected in that reproduction because it only used a long `context`,
not a long `topic`). This bug is List-view specific and hides functionality (Status, links,
Archive action) for every row, not just the offending one.

Confirmed via DOM inspection: the row containing the long topic measured `width: 5072px`; its
containing `overflow-x-auto` wrapper `clientWidth` was only `1222px` (so a horizontal scrollbar
does exist on the wrapper), but nothing in the visible viewport hints that a scrollbar is present
or that Status/Actions columns still exist off-screen — a user would reasonably believe the
Sessions list has silently lost its Status/Links/Actions columns entirely.

## Steps to Reproduce
1. In a project's Sessions list, create (or have) a session whose `topic` is one long unbroken
   string with no spaces (e.g. ~480 characters of continuous letters).
2. View the Sessions list containing that session alongside normal sessions.
3. Observe that from the Topic column onward, no other row (including unrelated rows with short
   topics) shows its Participant / Linked story / Linked task / Created / Status / Actions values
   within the visible viewport.

## Expected Result
The long unbroken topic value wraps or truncates (e.g. with `overflow-wrap: anywhere` /
`text-overflow: ellipsis` + `overflow: hidden` on the cell) within its own row, without affecting
the column widths of any other row in the table.

## Actual Result
The single long unbroken topic value forces the whole `<table>` to a much wider intrinsic size,
which — inside the table's `overflow-x-auto` wrapper — pushes Participant/Linked story/Linked
task/Created/Status/Actions out of view for every row in the list, not only the one with the long
value. No visible affordance in the viewport indicates a horizontal scrollbar is available.

## Additional Info
- Reproduced at 1512px browser width (well above the product's 1024px minimum supported width),
  so this is not a narrow-viewport-only issue.
- DOM measurements at time of reproduction: offending row `getBoundingClientRect().width` =
  `5072px`; the `div.overflow-x-auto` ancestor `clientWidth` = `1222px`, `scrollWidth` = `5072px`.
  `document.documentElement.scrollWidth` stayed at the viewport width (1512px) — confirming the
  overflow is contained to the list's own scroll wrapper, not the full page (distinguishing this
  from BUG-002's full-page overflow).
- Screenshot: `tc-002-page2.png` / `tc002-longtopic-overflow.png` (viewport capture showing only
  the Topic column header/values visible, all other columns absent from view).

## Fix Notes
Root cause: the `<table>` used the browser's default auto layout (`w-full`, no `table-layout`
declaration), so a single unbroken (space-free) `topic` string set the intrinsic width of its
cell — and therefore the whole table — to fit that string, regardless of the `overflow-x-auto`
wrapper. Every other row's later columns were pushed off past the wrapper's visible width as a
result, since column widths in auto layout are shared across the whole table, not per-row.

Fix (`frontend/src/features/sessions/components/SessionList.tsx`): switched the table to
`table-fixed` layout with explicit `w-[%]` widths on every `<th>`, so column widths are
determined by the header row alone and never grow to accommodate cell content. Added
`[overflow-wrap:anywhere]` (same pattern already used in `shared/utils/markdownStyles.ts`) to the
Topic, Participant, Linked story, and Linked task cells so a long unbroken value wraps within its
own fixed-width cell instead of overflowing visually into neighboring cells. Change is scoped
entirely to `SessionList.tsx` — no new shared utility introduced, so as not to collide with the
parallel BUG-002 fix (Session Detail view) which may want its own local wrapping/truncation
treatment.

## QA Verification (2026-07-30)
Re-tested against the original repro session ("LongTopicStress-AAAA…", ~486-char unbroken topic)
in "Test Project Alpha"'s 33-session list. The offending row now grows taller (wraps the topic
across many lines) but every other row's Participant/Linked story/Linked task/Created/Status/
Actions columns stay aligned and fully visible — confirmed via
`document.documentElement.scrollWidth === document.documentElement.clientWidth` (no page-wide
overflow) and visual inspection of both list pages. Marking `resolved`.
