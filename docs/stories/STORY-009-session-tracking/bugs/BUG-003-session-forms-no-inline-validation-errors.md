---
id: BUG-003
story: STORY-009
severity: minor
status: open
assignee: frontend-developer
---

# BUG-003: Create/Edit Session forms give no inline error message for missing required fields, unlike Story/Task forms elsewhere in the app

## Description
TC-006 (`tc-006-create-session-required-field-validation`) expects that submitting the Create
Session form (or saving an edit) with a required field (topic, goal, participant_role) empty
shows a clear inline validation error next to that field, consistent with the convention used
elsewhere in the app.

In practice, the Create Session and Session Detail edit forms never show any inline error message
at all. Instead, the "Create" / "Save changes" button is simply kept disabled while any required
field is empty, with no explicit feedback about which field(s) are missing beyond the `*`
required-indicator on the label. This is inconsistent with the established pattern already used
in this same app: the "New story" form, for example, allows the empty submission attempt and then
shows an inline `alert` reading "Title is required." right under the field.

The underlying business rule (a session cannot be created/saved without topic, goal, and
participant_role) is correctly enforced either way — this is a UX/consistency defect, not a data
integrity one.

## Steps to Reproduce
1. Open "Create session" for any project.
2. Leave Topic empty, fill in Goal and Participant role.
3. Observe the Create button and the form — no inline error is shown anywhere.
4. For comparison: open "New story" for the same project, leave Title empty, and click Create —
   an inline alert "Title is required." appears next to the Title field.

## Expected Result
Attempting to submit a Create/Edit Session form with a required field empty shows a clear inline
error message next to that field (matching the Story/Task form convention), in addition to or
instead of the disabled-button treatment.

## Actual Result
No inline error message is ever shown on the Create Session or Session Detail edit forms. The
Create/Save button simply stays disabled while a required field is empty; a user has no explicit
in-form explanation of why, beyond the `*` label indicator.

## Additional Info
- Verified by direct side-by-side comparison in the same running app: `New story` (Task Manager)
  uses the inline-alert pattern; `New session` / Session Detail edit do not.
- This also means the "if the control allows an empty/placeholder state" conditional check in
  TC-006/TC-011 for `participant_role` could not be exercised — the dropdown always defaults to
  the first valid role and can never be left blank, so there is no way to test a blank
  `participant_role` submission through the UI at all. Not filed as a separate defect since the
  story's acceptance criteria don't require an empty-selection state to be reachable — noting it
  here for context since it's the same form.
