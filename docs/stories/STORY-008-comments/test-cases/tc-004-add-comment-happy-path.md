---
id: tc-004
tags: @smoke @regression
story: STORY-008
status: Active
---

# tc-004: Add a comment — happy path, author_role pre-fill, form reset

## Preconditions
- App is running at http://localhost:3000
- A story's slide-over is open with the Comments section visible
- The project's effective default Web UI role is set to some value (e.g. "operator")

## Steps
1. Observe the Add Comment form's `author_role` field before typing anything
2. Type Markdown content into the `content` textarea (e.g. `**bold** and a list item`)
3. Add one label via the labels editor (key/value pair)
4. Submit the form
5. After submission, observe the Add Comment form again

## Expected Result
- Before submitting, `author_role` is already pre-filled with the project's effective default Web UI role — the user did not have to type it
- On submit, the new comment appears at the top of the thread (newest-first order preserved) showing the submitted author role, the content rendered as Markdown, and the label chip
- The Comments count badge increments by one
- No error banner or lingering spinner remains after the operation
- The form resets after success: `content` and `labels` are cleared, and `author_role` is reset to the effective default Web UI role again — not to whatever value was last present in the field
