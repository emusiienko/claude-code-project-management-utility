# Board View

## Happy Path

1. The orchestrator opens a project's **Board** view and sees a kanban with one column per value in
   the project's `story_statuses` dictionary — columns always mirror that dictionary, never
   hardcoded.
2. Each column shows the status name, a card count, and the project's stories currently in that
   status (oldest first).
3. Dragging a story card to another column changes that story's status immediately.

## Other Scenarios

- **Filter by milestone**: a combobox lets the orchestrator narrow the board to one milestone (with
  a status hint, e.g. "Sprint 1 (Active)") or view "All stories"; it defaults to the project's active
  milestone if one exists, otherwise to "All stories," and can be changed at any time.
- **Open a story from its card**: clicking a card's title opens the same Story Detail view reached
  from the Stories list.

## Who Can Access It

Web UI only — this view has no AI-agent (MCP) equivalent (agents work with the underlying Stories
data directly).

## Business Rules

- Board columns always mirror the project's current effective `story_statuses` — adding, removing,
  or reordering that dictionary immediately changes the Board's columns.
- At most one milestone per project can be "Active" at a time (see [`milestones.md`](milestones.md)); the Board
  defaults to filtering on that milestone when one exists.
- A story with no status, or a status no longer present in the project's dictionary, is silently
  excluded from the board rather than shown in an "unknown" column.

## Known Limitations

- If a drag-and-drop status change is rejected, the card visually snaps back to its original column
  and an inline error is shown on the card — including when the target status is no longer part of
  the project's current dictionary.
- A project with more than 100 stories only shows the first 100 on the Board.
