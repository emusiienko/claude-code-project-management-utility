---
id: TC-174
tags: @regression
story: STORY-022
status: Active
---

# TC-174: The main view (Task Manager or Sessions) never unmounts or navigates while the Projects/Config overlay is open

## Preconditions
- App is running at http://localhost:3000
- A project exists with at least one story

## Steps
1. Navigate to a project's Stories view. Note the exact scroll position / filter state if any is set (e.g. apply a status filter).
2. Open the Projects overlay, push to a project's Settings level, then click "Back" to return to the list.
3. Dismiss the overlay. Verify the Stories view underneath is exactly as it was — same filter state, same scroll position, no reload/refetch flash, and the URL never changed throughout steps 2–3.
4. Repeat from `/sessions`: open Config, verify the Sessions placeholder view is unaffected and the URL stays `/sessions` throughout, then Dismiss and confirm Sessions is unchanged.
5. Confirm the app-switcher's selected mode is derived purely from the current route at every point in steps 1–4 (it should read "Task Manager" throughout step 1–3, and "Sessions" throughout step 4, regardless of which overlay is open or at what stack depth).

## Expected Result
- Opening, navigating within, and dismissing the Projects/Config overlay never changes the URL and never unmounts or resets the main view underneath.
- The app-switcher's mode reflects the current route only, unaffected by overlay state.
