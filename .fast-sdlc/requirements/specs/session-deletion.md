# Session Deletion

Adds a delete operation to the existing Sessions capability (see
`documentation/business/sessions.md` for everything else about sessions, unchanged by this scope).
No new entity, attribute, or relationship — the Conceptual and Logical Data Model for Sessions
(`documentation/business/conceptual-data-model/sessions.yaml`,
`documentation/business/logical-data-model/sessions.yaml`) already cover the `Session` entity this
operation acts on; nothing there changes.

## Validation Rules

### Field-Level
Not applicable — the operation identifies a session to delete; it takes no other input fields.

### Business-Level
1. Via REST and MCP, the delete operation succeeds for any session regardless of its `archived` flag
   or `status` value — there is no server-side restriction to archived-only sessions.
2. In the Web UI, the delete action is available only on sessions with `archived = true`; the UI
   presents no control capable of deleting a non-archived session. This is a Web UI-only
   restriction — the underlying operation itself is unrestricted, per Rule 1.
3. Deletion is permanent. There is no soft-delete, undo, or recovery — once deleted, a session's
   data cannot be retrieved.
4. Deleting a session that has a `linked_story_id` and/or `linked_task_id` set does not affect the
   linked story or task in any way — only the session record itself is removed.

## Error Handling
| Scenario | User-Facing Outcome |
|----------|---------------------|
| Deleting a session that no longer exists (already deleted, or never existed) | The caller is told the session could not be found; nothing is deleted |

## Usage Limits
Not applicable — no business reason (cost, subscription tier) applies to this operation.
