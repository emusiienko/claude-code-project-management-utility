---
id: TC-181
tags: @regression
story: STORY-009
status: Active
---

# TC-181: Create session — participant_role is a dictionary-driven dropdown, not free text

## Preconditions
- App is running at http://localhost:3000
- The active project's effective `participant_roles` dictionary is known (check System Settings / Project Settings for the current list, e.g. via the Config overlay)
- Viewport at 1280px (desktop)

## Steps
1. Note the active project's effective `participant_roles` list from Settings.
2. Open "Create session" for that project.
3. Open the participant_role control. Confirm it is a dropdown/combobox (not a free-text input) and lists exactly the effective `participant_roles` values noted in step 1 — no extra or missing options.
4. Select a value, submit, and confirm the session is created with that participant_role shown correctly in the list and detail view.
5. (If the project has a settings override changing `participant_roles` from the system default) Switch to a project with a different effective `participant_roles` set, open "Create session" there, and confirm the dropdown options reflect that project's own effective list, not the previous project's.

## Expected Result
- The participant_role field on the Create Session form is always a dropdown populated from the active project's effective `participant_roles` dictionary — never a free-text field.
- Options update correctly per the active project's effective settings.
