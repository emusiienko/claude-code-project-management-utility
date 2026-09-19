---
id: TC-203
tags: @regression
story: STORY-008
status: Active
---

# TC-203: Deleting a session that was already deleted elsewhere (stale list) is reported, not silently accepted

## Preconditions
- App is running at http://localhost:3100
- An archived session exists in the active project ("Stale session")
- Two browser tabs/windows are open on the Sessions list for the same project, both with "include archived" on and both showing "Stale session"

## Steps
1. In Tab 1, leave the Sessions list showing "Stale session" as-is (do not reload).
2. In Tab 2, delete "Stale session" (confirm the deletion). Verify it disappears from Tab 2's list.
3. In Tab 1 (still showing the now-already-deleted "Stale session" from its stale view), use the delete action on that same row and confirm the deletion.
4. Observe Tab 1's result.
5. Reload Tab 1.

## Expected Result
- Tab 1 is told the session could not be found (an error/notice is shown) rather than the delete silently appearing to succeed with no feedback.
- No other session is affected by the attempt.
- After reloading Tab 1, "Stale session" is gone and the rest of the list is otherwise correct.
