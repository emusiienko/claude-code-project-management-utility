---
status: ToDo
assignee: frontend-developer
story: STORY-008
---

# TASK-010: Default Web UI role settings UI

## What to implement
Add a "Default Web UI role" row to both the System Settings and Project Settings views for the new
`default_web_ui_role` setting.

- A new row alongside the five existing dictionary rows, named and described generically (not
  comment-specific).
- Unlike the chip-list / link-types editors, this row is a **single-value dropdown** populated from
  the effective `participant_roles` list — because it holds exactly one value.
- System Settings: the dropdown reflects the current system value; Save updates the system default.
- Project Settings: shows the current project override with an Override badge, or the inherited
  system value otherwise, using the same Override/Edit and Clear-override controls as the other five
  keys (inheriting the same known clear-override backend gap).
- The dropdown only ever offers values currently present in the effective `participant_roles`, so a
  disallowed value cannot be chosen client-side.

## Scope
System and Project settings UI: the single-value dropdown row wired to the `default_web_ui_role`
setting.

## Dependencies
TASK-005.

## Acceptance Criteria
- [ ] Both settings views show a "Default Web UI role" row rendered as a single-value dropdown over
  the effective `participant_roles`.
- [ ] System Settings pre-selects the current system value and saves updates to it.
- [ ] Project Settings shows an override (with Override badge) or the inherited value, with
  Override/Edit and Clear-override controls consistent with the other keys.
- [ ] Only current effective `participant_roles` values are selectable.

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
