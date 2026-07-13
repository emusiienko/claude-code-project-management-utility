---
id: TC-096
tags: @regression
story: STORY-019
status: Active
---

# TC-096: Add Link form shows placeholder when no link types are configured

## Preconditions
- App is running at http://localhost:3000
- A project exists where the effective `link_types` dictionary has been cleared so it contains no entries (all default entries removed in project settings)
- A story with at least two tasks exists in the project
- Browser viewport set to 1280px wide

## Steps
1. Open the Task Detail Modal for any task in the project with no link types configured
2. Click "Add link" to open the Add link form
3. Observe the link type / direction area in the form
4. Close the task modal
5. Open a story's slide-over in the same project
6. Click "Add link" in the Links section
7. Observe the link type / direction area in the story Add link form

## Expected Result
- In both the task and story Add link forms, the link type area shows a placeholder message such as "No link types configured" (or equivalent)
- The dropdown is not shown or shows a disabled/empty state — no raw keys or blank entries visible
- The form is not in a broken state — no JavaScript errors, no crashes, no blank white areas
- The form can be closed/cancelled normally
