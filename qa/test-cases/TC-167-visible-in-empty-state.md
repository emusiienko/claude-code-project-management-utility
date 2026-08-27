---
id: TC-167
tags: @regression
story: STORY-022
status: Active
---

# TC-167: Cold start with zero projects auto-opens the Projects overlay; the entry stays functional with projects present or absent

## Preconditions
- App is running at http://localhost:3000
- Use a disposable test environment where all projects can be deleted for this check without affecting other test data — **do not run this against a shared environment with real project data**; if no disposable environment is available, verify the logic by reading `RootRedirect.tsx`'s cold-start branch instead (see Note)

## Steps
1. In a disposable environment, delete all projects, clear `localStorage` (so no `last_project_id` is recorded), and reload `/`.
2. Verify the app stays on `/` rendering an empty Task Manager main view ("No projects yet") and the Projects overlay opens automatically, showing the empty project list with a way to create the first project.
3. Dismiss the overlay. Verify it does not immediately reopen on its own (the auto-open fires once per mount, not on every background refetch).
4. Create a project from within the overlay. Verify the app behaves normally afterward (project appears in the list; selecting it proceeds as usual).
5. Switch to Sessions mode and back — verify "Projects"/"Config" remain visible and clickable regardless of whether any project exists.

## Expected Result
- A cold start with no projects lands on an empty Task Manager main view with the Projects overlay auto-opened, so the user can create a project without hunting for the entry point.
- The auto-open does not force itself back open after being dismissed.
- Both top-bar entries remain visible and functional whether zero or more projects exist, in both modes.

## Note
This TC is destructive (deletes all projects) and was not exercised against the shared local dev environment in the 2026-07-22 re-verification pass, consistent with the same judgment made in the two prior passes over this story. `RootRedirect.tsx`'s cold-start branch was read directly instead: it calls `openProjects()` once (guarded by a `useRef` flag) when the fetched project list is empty, and renders an inline "No projects yet" main view rather than redirecting anywhere (no route to redirect to any more). Recommend running this TC end-to-end in a disposable/throwaway environment.
