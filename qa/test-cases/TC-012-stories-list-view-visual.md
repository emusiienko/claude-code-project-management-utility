---
id: TC-012
tags: @smoke @regression
story: STORY-004
status: Active
---

# TC-012: Stories list view — visual layout

## Preconditions
- App is running at http://localhost:3000
- At least one project exists
- The project has at least two stories with different statuses and at least one story with labels

## Steps

### 375px (Mobile)
1. Set viewport to 375px wide
2. Navigate to `/projects/:id` for the project with stories
3. Apply universal visual checklist
4. Verify: page heading shows the project name
5. Verify: table renders with columns — Title, Status, Labels, Task aggregate
6. Verify: status badges are visible and readable
7. Verify: label chips are visible and not clipped
8. Verify: Edit and Delete icon buttons are present on each row
9. Verify: Delete icon is visually distinct (red/danger colour)
10. Verify: "New story" button is present above the table

### 767px (Below-md)
11. Repeat steps 2–10 at 767px viewport

### 768px (At-md)
12. Repeat steps 2–10 at 768px viewport

### 1280px (Desktop)
13. Repeat steps 2–10 at 1280px viewport

## Expected Result
- Universal visual checklist passes at all four resolutions
- Page heading matches the project name
- Table columns are visible with correct content in each row
- Status badges render as distinct visual chips
- Label chips are rendered without overflow or clipping
- Edit icon is neutral-coloured; Delete icon is red/danger-coloured
- "New story" button is visible and not obscured
