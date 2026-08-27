---
id: TC-005
tags: @smoke @regression
story: STORY-003
status: Active
---

# TC-005: Projects screen — visual pass

## Preconditions
- App is running at http://localhost:3000
- At least one project exists in the system

## Steps

For each resolution column (375px → 767px → 768px → 1280px):

1. Set viewport to the target width
2. Navigate to `/`
3. Verify all checklist items below

### Universal visual checklist

| Check | Mobile (375px) | Below-md (767px) | At-md (768px) | Desktop (1280px) |
|-------|----------------|-----------------|---------------|-----------------|
| Page loads without exception screen or "Something went wrong" overlay | | | | |
| No horizontal scrollbar appears | | | | |
| No content overlap or clipping (text, cards, buttons) | | | | |
| Grid and spacing are consistent — table columns aligned with headers | | | | |
| Text stays within container boundaries — no truncated or overflowed text | | | | |
| Navigation adapts at the correct breakpoint | | | | |
| Interactive elements not pushed off-screen; touch targets >= 44px on mobile | | | | |
| Modals, dropdowns, tooltips positioned correctly within viewport | | | | |
| Element states render correctly — hover, focus on at least one button | | | | |
| Long project name does not break table row layout | | | | |

### Screen-specific checks

| Check | Mobile (375px) | Below-md (767px) | At-md (768px) | Desktop (1280px) |
|-------|----------------|-----------------|---------------|-----------------|
| Project list table is visible with project rows | | | | |
| "Create project" button is visible and accessible | | | | |
| Each project row shows name and description (or placeholder for empty description) | | | | |
| Edit and Delete action buttons are visible per row | | | | |
| Page title or heading identifies the screen as Projects | | | | |

## Expected Result
All checklist items pass at all four resolutions. No layout breaks, no overlapping content, no horizontal overflow.
