# Stories

## Happy Path

1. From a project's **Stories** view, the orchestrator clicks **Create story**, fills in a title
   (required), optional Markdown content, an optional status (from the project's `story_statuses`),
   labels, and an optional milestone.
2. The new story appears in the Stories list, showing its status badge, label chips, and a live task
   aggregate (e.g. "3/5 done").
3. Clicking the story's title opens the **Story Detail** view — a two-column layout: the story's
   Task kanban on the left (see `tasks.md`), and a collapsible right panel on the right holding the
   story's description, milestone assignment, links to other stories, attachments, and comments. The
   border between the two panels is drag- and keyboard-resizable, holding the adjusted split for the
   rest of the browser session (until the page is reloaded).

## Other Scenarios

- **Filter the Stories list** by status, or by label key/value.
- **Edit a story**: same form, pre-filled; any field left untouched keeps its current value.
- **Delete a story**: removes it and everything nested in it (its tasks, attachments, comments, and
  any links touching it or its tasks) after a confirmation.
- **Assign/change/clear a milestone**: a single control on the Story Detail right panel, changing
  only the milestone assignment and nothing else about the story.
- **View the task aggregate**: computed on demand from the story's current tasks; a story with no
  tasks shows "0 of 0" rather than hiding the aggregate or erroring.

## Who Can Access It

Web UI (the human orchestrator) and AI agents (via MCP) — both with full read/write access. The
Stories list is paginated.

## Business Rules

- A story's title is always required.
- A story's `status`, if set, must be a value currently in the project's `story_statuses`
  dictionary — otherwise the attempt is rejected, naming the disallowed value and the currently
  allowed ones.
- A story's milestone, if set, must belong to the story's own project.
- The task aggregate is always computed live — never a stored, staleable field.
- Deleting a story is permanent and cascades to everything nested in it.

## Known Limitations

- A story linked from another story's Links section that has no status set is simply shown without a
  status badge, rather than erroring.
