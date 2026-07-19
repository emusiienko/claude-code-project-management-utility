---
status: ToDo
assignee: frontend-developer
story: STORY-008
---

# TASK-008: @role mention combobox and render highlighting

## What to implement
Add `@role` mention support to comment content — an accessible autocomplete on input plus mention
highlighting on render. This is the app's first non-native dropdown.

- **Autocomplete combobox.** While typing in the Add-Comment content field or editing an existing
  comment's content, typing `@` opens an inline autocomplete listing the project's effective
  `participant_roles`, filtered live as typing continues after `@`. Selecting an entry inserts
  `@<role-value>` as literal text at the cursor and closes the combobox; the user may instead
  dismiss it and keep typing free text. When no effective role matches the typed text, the combobox
  shows an empty state (not an error). The combobox only ever inserts text — no notification, link,
  or other side effect.
- **Accessibility (hard requirement).** Build to the ARIA combobox/listbox pattern and WCAG 2.1 AA:
  fully keyboard operable (arrow keys to move through matches, Enter to select the highlighted
  match, Escape to dismiss without inserting and return focus to the textarea at the same cursor
  position); focus is never trapped outside the textarea.
- **Render highlighting.** When comment content is rendered on any of the three hosts, a `@<value>`
  token that exactly matches a role currently in the project's effective `participant_roles` is
  shown as an accent-colored inline badge inside the rendered Markdown; a token matching no current
  role renders as plain text. This applies to comment content only.

## Scope
The mention combobox integrated into the comment content input (add + edit) and the render-time
mention highlighting in the comment thread. Comment story/task content fields elsewhere are
unaffected.

## Dependencies
TASK-007.

## Acceptance Criteria
- [ ] Typing `@` opens a live-filtered combobox over the effective `participant_roles`; selecting
  inserts `@<value>` at the cursor; dismissing leaves free text intact.
- [ ] No matches shows an empty combobox state, not an error.
- [ ] The combobox is fully keyboard operable (arrows / Enter / Escape), follows the ARIA
  combobox/listbox pattern, meets WCAG 2.1 AA, and never traps focus outside the textarea.
- [ ] On render, `@<value>` tokens matching a current effective role are highlighted as accent
  badges; non-matching tokens render as plain text.
- [ ] Content is stored/returned exactly as typed; a mention whose role is later removed renders as
  plain text with no data change.

## Intended ADR
None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:
