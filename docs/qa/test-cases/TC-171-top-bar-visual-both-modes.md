---
id: TC-171
tags: @regression
story: STORY-022
status: Active
---

# TC-171: Visual — global Projects/Config entries and the ~70vw overlay panel, across breakpoints and both modes

## Preconditions
- App is running at http://localhost:3000
- At least one project exists
- Dark mode is out of scope (not implemented in this project)

## Steps

For each resolution column (375px → 767px → 768px → 1280px), repeat for both Task Manager mode (`/projects/:id/stories`) and Sessions mode (`/sessions`):

1. Set viewport to the target width
2. Verify the top-bar checklist below
3. Open the Projects overlay and verify the panel checklist below
4. Repeat the panel checklist for the Config overlay

### Top-bar checklist

| Check | Mobile (375px) | Below-md (767px) | At-md (768px) | Desktop (1280px) |
|-------|----------------|-----------------|---------------|-----------------|
| Top bar renders without exception screen or overlap | | | | |
| "Projects"/"Config" labels/icons fully visible — not truncated or clipped | | | | |
| No visual overlap between the two entries or with the app-switcher combobox | | | | |
| Touch target of each entry is >= 44px in height | | | | |
| Focus ring on each entry (via Tab) renders fully within the viewport, not clipped | | | | |
| No horizontal scrollbar appears on the top bar | | | | |

### Overlay panel checklist

| Check | Mobile (375px) | Below-md (767px) | At-md (768px) | Desktop (1280px) |
|-------|----------------|-----------------|---------------|-----------------|
| Panel width is ~70% of the viewport width (measure via bounding rect / viewport width ratio) | | | | |
| Panel content (project list / Settings editor / system dictionary editor) renders without horizontal scroll or clipped columns | | | | |
| Backdrop starts below the top bar (does not visually clip the top bar) | | | | |
| Back (when present) and Dismiss controls are both visible and not clipped | | | | |
| No content overlap between the panel and the dimmed main view behind it | | | | |

## Expected Result
All checklist items pass at all four resolutions, in both Task Manager and Sessions modes, for both the Projects and Config overlays. No layout breaks, clipping, or overlap.

## Verified this pass (desktop spot check only, ~1512px ambient viewport)
Panel width measured at exactly 70.0% of viewport width (1058.4px / 1512px) for both Projects and Config panels — matches the addendum in TASK-009's implementation report. No viewport-resize tool was available in this session, so the full 375/767/768px sweep was not exhaustively re-run; flagged as a coverage gap consistent with prior passes over this story.
