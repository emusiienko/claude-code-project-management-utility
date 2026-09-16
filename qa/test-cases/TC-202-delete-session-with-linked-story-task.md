---
id: TC-202
tags: @regression
story: STORY-008
status: Active
---

# TC-202: Deleting a session with a linked story and/or task leaves the linked story/task unaffected

## Preconditions
- App is running at http://localhost:3100
- An archived session exists in the active project with both a linked story and a linked task set
- The linked story and linked task are otherwise ordinary, unarchived items
- Viewport at 1280px (desktop)

## Steps
1. Open the session's Detail view. Note the linked story's and linked task's titles.
2. Follow the link to the story — confirm it opens the story's own detail view showing its normal data.
3. Follow the link to the task — confirm it opens the task's own detail view showing its normal data.
4. Return to the Sessions list, with "include archived" on. Delete the session (confirm the deletion).
5. Navigate to the linked story's detail view directly (not via the now-deleted session).
6. Navigate to the linked task's detail view directly.

## Expected Result
- After the session is deleted, the previously-linked story still exists, opens normally, and shows no error, broken reference, or leftover trace of the deleted session.
- The previously-linked task still exists, opens normally, and shows no error, broken reference, or leftover trace of the deleted session.
- Only the session record itself was removed — the story and task are otherwise unchanged.
