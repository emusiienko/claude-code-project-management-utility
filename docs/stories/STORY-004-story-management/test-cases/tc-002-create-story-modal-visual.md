---
id: tc-002
tags: @smoke @regression
story: STORY-004
status: Active
---

# tc-002: Create story modal — visual layout

## Preconditions
- App is running at http://localhost:3000
- At least one project exists
- Navigate to `/projects/:id`

## Steps

### 1280px (Desktop — primary visual pass)
1. Set viewport to 1280px wide
2. Navigate to the project's stories view
3. Click the "New story" button
4. Verify: modal opens and overlays the page
5. Verify: modal contains a Title text input (required, labelled)
6. Verify: modal contains a Content markdown textarea (optional, labelled)
7. Verify: modal contains a Status dropdown (optional, labelled)
8. Verify: modal contains a Labels key-value editor section
9. Verify: modal has a clearly visible primary "Save" / "Create" button and a cancel/close control
10. Apply universal visual checklist to the modal overlay
11. Verify: modal is fully visible within the viewport — no clipping at top or bottom
12. Verify: required field indicator is present on the Title field

### 375px (Mobile)
13. Set viewport to 375px
14. Open the create story modal
15. Verify: modal is fully visible and scrollable if content exceeds viewport height
16. Verify: all form fields are accessible and not pushed off-screen
17. Apply universal visual checklist

## Expected Result
- Modal opens on "New story" click at all tested viewports
- All four fields (Title, Content, Status, Labels) are present and properly labelled
- Required indicator is visible on Title
- Modal is contained within the viewport; no horizontal scrollbar introduced
- Save/Create and cancel controls are clearly visible and accessible
