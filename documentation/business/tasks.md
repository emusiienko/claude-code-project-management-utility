# Tasks

## Happy Path

1. From inside a Story Detail view's Task kanban, the orchestrator clicks **Add task** on a column,
   filling in a title (required), type (required, from `task_types`), that column's status
   (pre-filled), an optional assignee role, an optional creator role, and labels.
2. The new task card appears in that column, showing its title, type badge, assignee role (if set),
   and label chips.
3. Clicking the card opens **Task Detail** — a full-screen view with the task's metadata plus its
   Links, Attachments, and Comments sections.

## Other Scenarios

- **Filter the task kanban** by type, assignee role, or creator role — non-matching cards dim rather
  than disappear.
- **Move a task**: dragging its card to another column changes its status immediately.
- **Edit a task**: inline, in place, on the Task Detail view.
- **Delete a task**: removes it and everything nested in it (attachments, comments, any links
  touching it) after a confirmation.
- **See what a task depends on**: there is no dedicated dependencies view — a "depends on"
  relationship is just a regular link (see Work Item Linking) using whichever `link_types` value the
  project has set up for that meaning. It's read the same way as any other link, from the task's own
  Links section.

## Who Can Access It

Web UI (the human orchestrator) and AI agents (via MCP) — both with full read/write access. A
project/story's task list is paginated.

## Business Rules

- A task always belongs to exactly one story, and that never changes after creation.
- A task's title, type, and status are always required; type and status must each be a value
  currently in the project's respective dictionary.
- An assignee or creator role, if set, must be a value currently in the project's
  `participant_roles`; either can always be cleared even if its current value is no longer in that
  dictionary.
- Links (including any that represent a dependency) are purely informational — the utility stores
  facts about links between tasks but never blocks any action based on them.
- Deleting a task is permanent and cascades to everything nested in it.

## Known Limitations

None currently known beyond what's already noted for Work Item Linking and Attachments/Comments,
which a task's own sections inherit. (A prior version of this file described a dedicated, separately
readable "dependencies view" as an existing feature — a review against the as-built API
Contract confirmed no such dedicated read exists; corrected above.)
