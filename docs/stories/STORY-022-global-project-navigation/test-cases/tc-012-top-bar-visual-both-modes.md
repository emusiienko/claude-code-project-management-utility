---
id: tc-012
tags: @regression
story: STORY-022
status: Active
---

# tc-012: Visual — global Projects entry in the top bar, across breakpoints and both modes

## Preconditions
- App is running at http://localhost:3000
- At least one project exists
- Dark mode is out of scope (not implemented in this project)

## Steps

For each resolution column (375px → 767px → 768px → 1280px), repeat for both Task Manager mode (`/projects/:id/stories`) and Sessions mode (`/sessions`):

1. Set viewport to the target width
2. Navigate to the target route for the mode under test
3. Verify all checklist items below

### Checklist

| Check | Mobile (375px) | Below-md (767px) | At-md (768px) | Desktop (1280px) |
|-------|----------------|-----------------|---------------|-----------------|
| Top bar renders without exception screen or overlap | | | | |
| "Projects" entry label/icon is fully visible — not truncated or clipped | | | | |
| No visual overlap between the "Projects" entry and its neighbors (Settings button in Task Manager mode; app-switcher combobox in both modes) | | | | |
| Spacing between "Projects" and "Settings" (Task Manager mode) is consistent with spacing between other top-bar controls | | | | |
| Touch target of the "Projects" entry is >= 44px in height | | | | |
| Focus ring on the "Projects" entry (via Tab) renders fully within the viewport, not clipped | | | | |
| Current-page highlight renders correctly on the "Projects" entry while on `/projects` | | | | |
| No horizontal scrollbar appears on the top bar | | | | |

## Expected Result
All checklist items pass at all four resolutions, in both Task Manager and Sessions modes. No layout breaks, clipping, or overlap around the relocated Projects entry.
