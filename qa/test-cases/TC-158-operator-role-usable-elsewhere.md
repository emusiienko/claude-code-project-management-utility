---
id: TC-158
tags: @regression
story: STORY-008
status: Active
---

# TC-158: operator role is usable anywhere participant_roles is used

## Preconditions
- The system or project's effective `participant_roles` list includes "operator"
- A task exists that can be opened for editing

## Steps
1. Open a task's detail view and locate its `assignee_role` (or `creator_role`, whichever is exposed as an editable dropdown/text field sourced from `participant_roles`)
2. Check whether "operator" is offered as a selectable value
3. Select "operator" and save

## Expected Result
- "operator" appears as an ordinary selectable entry anywhere the project's `participant_roles` dictionary is consumed — not restricted to the Default Web UI role setting
- Selecting and saving "operator" for the task field succeeds like any other role value, with no special-casing or error
