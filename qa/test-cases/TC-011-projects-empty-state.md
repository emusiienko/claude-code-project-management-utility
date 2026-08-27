---
id: TC-011
tags: @regression
story: STORY-003
status: Active
---

# TC-011: Projects screen — empty state renders correctly

## Preconditions
- App is running at http://localhost:3000
- Viewport: 1280px (desktop)
- No projects exist in the system (system has been freshly started or all projects deleted)

## Steps

1. Navigate to `/`
2. Observe the page content

## Expected Result
- The page loads without an error or "Something went wrong" message
- An empty-state UI is shown (e.g. a message indicating no projects exist)
- The "Create project" button is still visible and accessible
- There is no table or list of project rows
