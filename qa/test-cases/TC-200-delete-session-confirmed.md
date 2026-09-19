---
id: TC-200
tags: @smoke @regression
story: STORY-008
status: Active
---

# TC-200: Delete an archived session — confirmation dialog, confirmed delete is permanent

## Preconditions
- App is running at http://localhost:3100
- An archived session exists in the active project ("Session to delete")
- Viewport at 1280px (desktop)

## Steps
1. With "include archived" on, locate "Session to delete" in the Sessions list.
2. Use its delete action.
3. Verify: a confirmation dialog appears, naming the session ("Session to delete"), with a destructively-styled confirm button and a cancel button.
4. Click the confirm button.
5. Observe the result in the list.
6. Reload the browser page, with "include archived" still on.
7. Attempt to locate "Session to delete" again in the list.

## Expected Result
- Confirmation dialog opens on the delete action, names the session, and offers a destructive confirm plus a cancel.
- After confirming, the dialog closes and the session is removed from the list without a full page reload.
- After reloading the page, the session still does not appear anywhere in the list (with "include archived" on) — deletion is permanent, not reversible.
