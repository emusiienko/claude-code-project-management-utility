---
status: ToDo
assignee: backend-developer
story: STORY-008
---

# TASK-005: default_web_ui_role setting and operator seed

## What to implement
Add a new single-value setting, `default_web_ui_role`, to the existing settings store, and update
the settings seed for a clean install.

- **Scalar setting in the shared store.** Reuse the existing `(key, values)` row mechanism, the
  system-default + project-override resolution, and the clear-override path (which continues to
  inherit the known REST/MCP clear-override gap — do not close it here). The value is a single
  string, stored uniformly in the existing JSON `values` column and exposed as a scalar on the
  settings request/response surface. It appears in the effective-settings payload alongside the
  five dictionaries.
- **Validation on write.** The value must be non-empty and a member of the effective
  `participant_roles` for the scope being written: system `participant_roles` for a system write;
  the project's effective `participant_roles` for a project override. The value is not re-validated
  on read, and it never constrains a comment's own free-form `author_role`.
- **Surface.** Add `default_web_ui_role` to the settings update body and to the effective-settings
  and system/project-overrides responses; mirror it in the settings MCP tools. No new routes.
- **Seed (clean install).** Edit the settings seed migration in place to (a) add `"operator"` to
  the system `participant_roles` default and (b) seed the system `default_web_ui_role` row as
  `"operator"`. The migration chain is re-run as a clean install (pre-production DB); no backfill of
  project-level overrides.

## Scope
Settings domain (schema, service, controller, MCP tools) and the settings seed migration. This task
is independent of the comments domain.

## Dependencies
None.

## Acceptance Criteria
- [ ] A fresh clean install seeds `participant_roles` including `"operator"` and a system
  `default_web_ui_role` of `"operator"`.
- [ ] `default_web_ui_role` is returned in the effective settings and in system/project overrides,
  and is settable via the settings update body and the settings MCP tools.
- [ ] Setting `default_web_ui_role` to a value outside the effective `participant_roles` is rejected
  with the dictionary-value error message; a valid value is accepted.
- [ ] Setting a system value validates against system `participant_roles`; setting a project
  override validates against that project's effective `participant_roles`.
- [ ] `"operator"` is selectable anywhere `participant_roles` is used (e.g. a task's role fields),
  as an ordinary dictionary entry.

## Intended ADR
None directly (the scalar-setting and operator-role decisions are recorded as Planned ADRs in the
implementation plan; ADR files created at Reconcile).

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:
