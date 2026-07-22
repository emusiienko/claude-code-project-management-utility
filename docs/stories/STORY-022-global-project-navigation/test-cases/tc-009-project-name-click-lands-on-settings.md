---
id: tc-009
tags: @smoke @regression
story: STORY-022
status: Active
---

# tc-009: Projects overlay — selecting a project pushes its Settings panel (no route change)

## Preconditions
- App is running at http://localhost:3000
- At least one project exists

## Steps
1. Open the Projects overlay (from any main view).
2. Click a project's name in the list (the row is a `<button>`, not a route link).
3. Verify the panel pushes to that project's Settings level: a heading with the project's name, the dictionary-override editor, a "Back" control (now present, since the stack has depth), and an "Open in Task Manager" button. Verify the URL has not changed (no route navigation occurred — this is an internal overlay-stack push, not a page navigation).
4. Click "Open in Task Manager". Verify the main view navigates to that project's Stories, the overlay is dismissed in the same action, and the three-tab sub-navigation (Stories/Board/Milestones) is present and functional (use it to reach Board, then Milestones — both load normally).

## Expected Result
- Selecting a project in the Projects overlay pushes its Settings panel without any route/URL change.
- "Open in Task Manager" is the resolved path from the Settings panel into that project's Stories/Board/Milestones (see also tc-014, which tests this specifically for a project not yet opened this session — the BUG-006 scenario).
