---
id: TC-148
tags: @regression
story: STORY-008
status: Active
---

# TC-148: @role mention combobox — no matches, dismiss and free text after @

## Preconditions
- The Add Comment form's `content` field is focused

## Steps

### Part A — no matches
1. Type `@` followed by a string that matches none of the project's effective `participant_roles` values (e.g. `@zzzznotarole`)

### Part B — ignore the combobox
1. Type `@` to open the combobox
2. Instead of selecting a match, continue typing arbitrary free text (not selecting anything, not pressing Escape)
3. Finish the sentence and submit the comment

## Expected Result
- Part A: the combobox shows an empty state (e.g. "no matches") — this is not treated as an error, no exception or console error occurs
- Part B: the combobox does not force a selection; whatever free text was typed after `@` is preserved verbatim in the submitted comment's content
- In both parts, the rest of the compose form remains usable and no layout break occurs
