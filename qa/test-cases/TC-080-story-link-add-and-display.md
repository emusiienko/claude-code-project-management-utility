---
id: TC-080
tags: @smoke @regression
story: STORY-006
status: Active
---

# TC-080: Story slide-over — Add a story link and verify display

## Preconditions
- App is running at http://localhost:3000
- A project exists with at least two stories (Story A and Story B)
- The project's effective `link_types` dictionary contains at least one entry
- Story A's slide-over is open
- Browser viewport set to 1280px wide

## Steps
1. In Story A's slide-over, find the Links section and click "Add link"
2. In the Add link form, type the title of Story B in the search/target field
3. Select Story B from the search results
4. Choose a directional label from the dropdown
5. Submit the form

## Expected Result
- After submission, the Add link form closes or resets
- The Links list refreshes without a full page reload
- A new row appears in the Links section with:
  - A direction indicator showing outbound (e.g. "→")
  - The link type displayed as a human-readable badge
  - Story B's title displayed as the linked item
- The row is visually consistent with the rest of the section (font, spacing, alignment)
- No error message or spinner remains after the operation
