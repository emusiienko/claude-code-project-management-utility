---
id: TC-201
tags: @regression
story: STORY-008
status: Active
---

# TC-201: Delete an archived session — cancel from the confirmation dialog leaves it intact

## Preconditions
- App is running at http://localhost:3100
- An archived session exists in the active project
- Viewport at 1280px (desktop)

## Steps
1. With "include archived" on, note the session count in the Sessions list.
2. Use the delete action on the archived session.
3. Verify: confirmation dialog opens.
4. Click the cancel / dismiss button on the dialog.
5. Observe the result.

## Expected Result
- Dialog closes after clicking cancel.
- The session remains in the list, still archived — nothing is deleted.
- Session count in the list is unchanged.
- The session is still fully interactive (its archive/delete actions still respond, and its Detail view still opens and is editable).
