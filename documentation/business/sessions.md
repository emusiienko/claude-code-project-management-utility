# Sessions

## Happy Path

1. The orchestrator switches to the **Sessions** app mode (a top-level mode alongside Task Manager,
   with its own project-selector sidebar) and picks a project. That sidebar's width is drag- and
   keyboard-resizable, holding the adjusted width until the page is next reloaded.
2. They click **Create session**, filling in a topic and a goal (both required), an optional
   context, and a required participant role (chosen from the project's configured roles). Two
   independent optional links — to a story and/or a task in the same project — may also be set.
3. The new session appears in the (paginated) list, starting at status `pending` regardless of
   anything else supplied at creation.
4. Selecting the session opens **Session Detail**, showing the full record and letting every
   updatable field be edited, including a status control that moves freely between `pending`,
   `in-progress`, and `finished` at any time, in either direction.

## Other Scenarios

- **Filter the Sessions list**: "incomplete only" (pending or in-progress) and/or by linked story,
  independently combinable; an "include archived" toggle controls whether archived sessions appear.
- **Record a result**: filling in `result_decisions`/`result_summary` at any point, independently of
  the session's status.
- **Archive a session**: from the list or the detail view; an archived session stays fully visible
  and editable — archiving only affects whether it shows by default in the list.
- **Follow a link**: clicking a session's linked story or task navigates to that item's own detail
  view in Task Manager mode.

## Who Can Access It

Web UI (the human orchestrator) and AI agents (via MCP) — both with full read/write access. Every
session belongs to exactly one project; there is no cross-project Sessions view.

## Business Rules

- A session is **incomplete** while its status is `pending` or `in-progress`, and **complete** once
  `finished` — always set explicitly, never inferred from whether the result fields are filled in.
- Topic, goal, and participant role can be changed to a new valid value but never cleared once set.
- `linked_story_id` and `linked_task_id` are fully independent — either, both, or neither may be
  set, and neither substitutes for the other or for the session's own mandatory project scope.
- If a linked story or task is later deleted, only that specific link is cleared — the session and
  its other link (if any) are unaffected.
- Deleting a session's project deletes the session itself, not merely unlinking it.

## Known Limitations

None currently known.
