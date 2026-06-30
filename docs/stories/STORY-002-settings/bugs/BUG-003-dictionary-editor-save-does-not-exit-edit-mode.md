---
id: BUG-003
story: STORY-002
severity: major
status: resolved
assignee: frontend-developer
---

# BUG-003: DictionaryEditor does not exit edit mode after successful save

## Description

After clicking "Save" on a dictionary section in System Settings (`/settings`), the section remains in edit mode — the tag list still shows remove (×) buttons, the input field and Add button stay visible, and the Save/Cancel buttons remain. No success toast, inline confirmation, or visual state change occurs. The data is persisted correctly (PUT `/v1/system/settings` returns 200 OK), but the UI does not react to the successful response.

## Steps to Reproduce

1. Navigate to `http://localhost:3000/settings`
2. Click "Edit" on the "Task Statuses" section
3. Type "custom-status" in the input field and click "Add"
4. Click "Save"

## Expected Result

- The section exits edit mode and returns to the read-only tag view
- The updated list (including "custom-status") is visible as read-only chips
- A success indicator appears (toast notification, button state change, or inline confirmation)

## Actual Result

- The section remains in edit mode after Save
- Save/Cancel buttons are still visible
- Tags still show the × remove buttons
- No success or error feedback is shown
- (The data is saved correctly — verified via `GET /v1/system/settings` returning the new value)

## Additional Info

Network log confirms `PUT /v1/system/settings` → 200 OK. No JavaScript errors in console. The mutation callback likely does not call the state setter that exits edit mode.

Screenshot: `docs/qa/results/tc003-save-no-response.png`
