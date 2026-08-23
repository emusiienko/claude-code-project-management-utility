# Work Item Linking

## Happy Path

1. From a task's or a story's detail view, the orchestrator opens its **Links** section and clicks
   **Add link**.
2. They pick a target item — a task within the same story, for a task link; a story within the same
   project, for a story link — and a directional label sourced from the project's `link_types`
   dictionary (e.g. "depends on" / "dependent").
3. The link appears immediately in both linked items' Links sections, each showing a direction
   indicator, the direction-aware label, and the other item's clickable title.

## Other Scenarios

- **Choosing an inbound-direction label**: the link is still created correctly — direction is
  preserved even though the item being viewed is the target, not the source.
- **Deleting a link**: removes it from both sides after a confirmation, with no other effect on
  either linked item.
- **Navigating a link**: clicking the linked item's title opens that item's own detail view directly.

## Who Can Access It

Web UI (the human orchestrator) and AI agents (via MCP) — both with full read/write access.

## Business Rules

- TaskLinks are scoped to a single story — two tasks in different stories can never be linked.
- StoryLinks are scoped to a single project — two stories in different projects can never be linked.
- The same directed link (same source, target, and type) can only exist once.
- Deleting either endpoint of a link removes the link itself; a link's existence never blocks
  deleting either endpoint.

## Known Limitations

- If a project has no `link_types` configured, the Add Link form shows "No link types configured"
  rather than an empty or broken dropdown.
- A link type value that was later removed from the dictionary still displays on existing links —
  falling back to showing the raw stored value rather than erroring.
