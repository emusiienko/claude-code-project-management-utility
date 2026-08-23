# Milestones

## Happy Path

1. From a project's **Milestones** view, the orchestrator clicks **Create milestone**, giving it a
   name (required, unique within the project) and an optional description; it starts as `Planned`.
2. They click **Activate** on it; if another milestone in the project was already `Active`, that one
   is demoted to `Planned` in the same action.
3. The Board view's default filter now follows this newly active milestone.
4. Once the work is done, **Finish** sets it to `Finished`, and the Board reverts to showing all
   stories, unfiltered.

## Other Scenarios

- **Edit a milestone**: name and description, pre-filled.
- **Delete a milestone**: every story currently assigned to it has its assignment cleared (the
  stories themselves are never deleted); a confirmation names this effect before it happens.
- **Open Milestone Detail**: name, description, status, story count, a paginated list of assigned
  stories, and the milestone's own Attachments and Comments sections (identical behavior to a
  Story's).

## Who Can Access It

Web UI (the human orchestrator) and AI agents (via MCP) — both with full read/write access. The
Milestones list, and a milestone's assigned-stories list, are paginated.

## Business Rules

- A milestone's name must be unique within its own project (case-insensitive).
- Only one milestone per project can be `Active` at any time.
- Activating an already-active milestone, or finishing an already-finished one, succeeds with no
  additional effect.
- `story_count` is always computed live from current assignments — never a stored, staleable field.
- Deleting a project cascades to delete all of its milestones.

## Known Limitations

None currently known.
