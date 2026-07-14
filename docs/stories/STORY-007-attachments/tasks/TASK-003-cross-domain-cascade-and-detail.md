---
status: ToDo
assignee: backend-developer
story: STORY-007
---

# TASK-003: Cross-domain cascade delete and detail composition

## What to implement

Integrate the attachments domain into the story, task, and milestone domains through an
`AttachmentReader` Protocol declared in the attachments service module and satisfied structurally by
the attachment service (injected via the DI container). This follows the established one-way Protocol
injection pattern (work-item service depends on a Protocol, never on the concrete attachments
package) used by task-links and story-links — no circular imports.

**Application-level cascade delete:**
- When a story, task, or milestone is deleted, permanently remove all of that container's attachments —
  the attachment rows and the files on disk — before the container is removed.
  Because `container_id` has no foreign key, this cannot be delegated to the database; it is done in
  the work-item service's delete via the Protocol. This extends the ADR-018 application-cascade
  precedent and honors the rule that a container delete permanently removes its attachments (overriding
  the archive-not-delete rule, since the container no longer exists).

**Detail composition:**
- Populate `attachments` in the story detail and task detail responses via the Protocol, replacing the
  current empty placeholder arrays.
- Build `GET /milestones/:id/detail` (and its MCP counterpart) for the first time, composing the
  milestone's attachments. Its `comments` array remains empty pending STORY-008, matching how
  story/task detail composition was staged. This closes the milestone-detail Known Divergence for the
  attachments half.

## Scope
`backend/app/stories/` (service delete + detail), `backend/app/tasks/` (service delete + detail),
`backend/app/milestones/` (service delete + new detail endpoint + MCP tool), `backend/app/container/`
(inject the reader Protocol). No changes to the attachments service surface from TASK-002.

## Dependencies
TASK-002.

## Acceptance Criteria
- [ ] Deleting a story permanently removes all its attachments and their files.
- [ ] Deleting a task permanently removes all its attachments and their files.
- [ ] Deleting a milestone permanently removes all its attachments and their files.
- [ ] Story detail and task detail return their attachments (no longer empty).
- [ ] `GET /milestones/:id/detail` returns the milestone with its attachments composed and an empty comments array; a mirrored MCP tool exists.
- [ ] Work-item services depend on attachments only through the Protocol, with no circular import.

## Intended ADR
None created here. The application-level cascade over a polymorphic FK-less container is recorded at Reconcile (see implementation_plan.md "Planned ADRs").

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:
</content>
