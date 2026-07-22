---
id: TC-169
tags: @regression
story: STORY-022
status: Active
---

# TC-169: Task Manager sidebar project selection still lands on Stories

## Preconditions
- App is running at http://localhost:3000
- At least two projects exist

## Steps
1. Navigate to `/projects/:id/stories` for Project A (Task Manager mode).
2. Use the sidebar's project combobox to switch to Project B.
3. Verify navigation lands on Project B's Stories view (`/projects/:id/stories`) — not Settings.
4. Switch back to Project A by clicking its entry in the sidebar's project list (not the combobox).
5. Verify navigation lands on Project A's Stories view — not Settings.

## Expected Result
- Both the sidebar's project combobox and the sidebar's project list continue to land on the selected project's Stories view.
- Only the Projects Management page's project-name click target was changed by this story; the sidebar's landing destination is untouched.
