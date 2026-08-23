# Comments

## Happy Path

1. From a story's, task's, or milestone's **Comments** section, the orchestrator (or an agent) sees
   the existing thread rendered newest-first, with an **Add Comment** form pinned above it.
2. They fill in an author role (pre-filled from the project's configured default, freely editable)
   and Markdown content, then submit.
3. The new comment appears at the top of the (paginated) thread immediately.

## Other Scenarios

- **Reply to a comment**: marks a target and shows a dismissible "Replying to {author_role}'s
  comment" chip above the compose field; submitting posts an ordinary new top-of-thread comment
  carrying a "↩ Replying to {author_role}" line, clickable back to the original. Replies are flat —
  no visual nesting beyond that line.
- **Edit a comment**: only its content and labels can change; its author role is shown read-only.
- **Delete a comment**: permanent — if another comment's "Replying to…" line pointed at it, that line
  simply stops being clickable rather than breaking.
- **Copy a permalink**: copies a direct link to a comment; opening it later navigates to that
  comment's host item with the thread expanded and the comment scrolled into view and briefly
  highlighted.
- **Mention a role**: typing `@` in the compose or edit field opens an autocomplete of the project's
  current participant roles; selecting one inserts it as plain text. In the rendered thread, a
  mention matching a role currently configured for the project is visually highlighted.

## Who Can Access It

Web UI (the human orchestrator) and AI agents (via MCP) — both with full read/write access.

## Business Rules

- Every comment requires content and an author role; the author role is never validated against any
  fixed role list, and — once set — never changes.
- A reply's relationship to its parent is permanent and immutable once created.
- Deleting a story, task, or milestone permanently removes every comment on it.
- The thread and every paginated list are ordered newest-first; a reply's own lineage trail stays
  root-first regardless.

## Known Limitations

- Opening a permalink to a comment that has since been permanently deleted shows a calm "This
  comment is no longer available" message rather than navigating anywhere — a deleted comment
  carries no record of which item it used to belong to.
- A mention that no longer matches a currently configured role renders as plain, unhighlighted text.
