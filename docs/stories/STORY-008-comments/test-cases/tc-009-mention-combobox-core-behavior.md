---
id: tc-009
tags: @smoke @regression
story: STORY-008
status: Active
---

# tc-009: @role mention combobox — opens, filters, keyboard operable, inserts text

## Preconditions
- The Add Comment form's `content` field is focused (or an existing comment is in Edit mode)
- The project's effective `participant_roles` list has at least two entries

## Steps
1. Type `@` in the `content` field
2. Continue typing a few characters that match one of the effective `participant_roles` values
3. Use the Arrow Down / Arrow Up keys to move the highlighted match
4. Press `Enter` to select the highlighted match
5. Repeat from step 1, but this time press `Escape` after the combobox opens, before selecting anything

## Expected Result
- Typing `@` opens an inline autocomplete combobox listing the project's effective `participant_roles` values
- The list narrows live as more characters are typed after `@`
- The combobox is fully operable from the keyboard: Arrow keys move the highlighted match, `Enter` selects it
- Selecting a match inserts `@<role-value>` as literal text at the cursor position and closes the combobox
- Pressing `Escape` dismisses the combobox without inserting anything, and returns focus to the textarea at the same cursor position (no text is left behind from the aborted mention)
- Focus never becomes trapped outside the textarea at any point in this flow
