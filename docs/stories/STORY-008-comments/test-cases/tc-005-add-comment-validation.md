---
id: tc-005
tags: @regression
story: STORY-008
status: Active
---

# tc-005: Add Comment form validation — disabled submit and inline errors

## Preconditions
- App is running at http://localhost:3000
- Any host's Comments section is visible with the Add Comment form accessible

## Steps

### Part A — empty content
1. Clear the `author_role` field back to a non-empty value (leave the default pre-fill in place)
2. Leave `content` empty
3. Observe the Submit control

### Part B — empty author_role
1. Type valid content into `content`
2. Clear the `author_role` field entirely
3. Observe the Submit control
4. If the control is not fully disabled, attempt to submit

## Expected Result
- Part A: Submit is disabled while `content` is empty; no request is sent
- Part B: Submit is disabled while `author_role` is empty; if an attempt is forced through, an inline error appears below the `author_role` field (e.g. "Comment author is required.") and no comment is created
- In both parts, re-filling the missing field re-enables Submit and clears the inline error
- No console error or unhandled exception appears during either check
