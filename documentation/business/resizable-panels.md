# Resizable Panel Layouts

## Happy Path

1. In any Web UI layout that places a navigation/list panel next to a content/detail panel — the
   project navigation sidebar beside the Task Manager content, the sessions navigation sidebar beside
   the Sessions content, and the task board beside the Story Detail view's right-hand panel
   (description, attachments, comments) — hovering the cursor over the border between the two panels
   shows a resize affordance (the cursor changes), discoverable without instructions.
2. Clicking and dragging that border changes the width of the panels on either side continuously as
   the cursor moves, and stops adjusting once the mouse button is released.
3. Each panel pair remembers its own resized width independently: resizing one pair (e.g. the task
   board/story-detail-panel split) never changes the width of any other pair (e.g. the project
   navigation sidebar, or the sessions navigation sidebar).
4. A resized width holds only for the current browser session and only while navigating between
   views — reloading the page returns every panel pair to its default width.

## Other Scenarios

- **Keyboard operation**: every resize border is also keyboard-operable once focused — Arrow Left and
  Arrow Right move it 16 px per press, Home takes the panel to its minimum readable width, End takes
  it to its current maximum usable width (present for WCAG 2.1 AA compliance).
- **Clamping at the readability floor**: dragging (or pressing Home) toward the navigation/list
  panel's minimum readable width stops the panel from shrinking further — the border holds at that
  floor even if the cursor keeps moving past it.
- **Clamping at the usable ceiling**: dragging (or pressing End) toward the content/detail panel's
  maximum usable width stops the panel from growing further — the border holds at that ceiling even
  if the cursor keeps moving past it.
- **Browser window resize**: after a panel pair has been manually resized, it keeps the chosen width
  for as long as the window has room for it. If the window becomes too narrow for both the chosen
  width and the readability floor to fit, the pair falls back to its default width for that viewport;
  the separator stays visible and operable throughout, at every viewport width down to mobile widths
  — there is no small-viewport stacking/collapsing behavior for this layout to adapt into.
- **Collapsed panel pairs**: a panel that can already be collapsed (independent of this capability)
  hides its resize border while collapsed. Expanding it restores the resized width the pair had
  before it was collapsed.

## Who Can Access It

Public (Web UI only — no AI-agent/MCP equivalent; this is a client-side presentation behavior with no
underlying data for an agent to act on).

## Business Rules

- Every side-by-side navigation/content layout in the Web UI carries this behavior — not a fixed list
  of screens, but a rule about a class of layout. As of this writing: the project navigation sidebar,
  the sessions navigation sidebar, and the Story Detail task board/right-hand-panel split.
- Default / minimum / maximum widths, per panel pair:
  - Project navigation sidebar and sessions navigation sidebar: default 240 px, minimum 180 px,
    maximum 480 px (560 px reserved for the content beside them).
  - Story Detail's right-hand panel: default 320 px, minimum 280 px, maximum 560 px (400 px reserved
    for the task board).
- A resized width is scoped to its own panel pair and to the current browser session only; it is not
  shared across panel pairs and does not survive a page reload, but is preserved while navigating
  between views within the same session.
- A panel pair's existing collapse control (its own, unrelated persistence) is unaffected by this
  capability; only the resized width itself resets on collapse/expand back to the pair's pre-collapse
  size, not to the pair's default.

## Known Limitations

- There is no small-viewport adaptation (no stacking, no breakpoint-driven collapse) for any of the
  three panel pairs — the resize affordance stays present and operable at every viewport width,
  including on narrow/mobile-width screens, rather than being withdrawn below a given width.
