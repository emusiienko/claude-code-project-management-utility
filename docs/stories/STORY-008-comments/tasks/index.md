# STORY-008 — Tasks

| ID | Title | Assignee | Status |
|----|-------|----------|--------|
| TASK-001 | Comment model, migration, and repository | backend-developer | Done |
| TASK-002 | Comment service and schemas | backend-developer | Done |
| TASK-003 | Comment REST controller, MCP tools, and DI wiring | backend-developer | Done |
| TASK-004 | Detail composition and cascade delete | backend-developer | Done |
| TASK-005 | default_web_ui_role setting and operator seed | backend-developer | Done |
| TASK-006 | Comments API client and hooks | frontend-developer | Done |
| TASK-007 | CommentsSection with forms, actions, and host mounts | frontend-developer | Done |
| TASK-008 | @role mention combobox and render highlighting | frontend-developer | Done |
| TASK-009 | Comment permalink resolver and deep-linking | frontend-developer | Done |
| TASK-010 | Default Web UI role settings UI | frontend-developer | Done |
| TASK-011 | Automated tests for comments and the new setting | qa-automation | Done |
| TASK-012 | Flip comment list ordering to newest-first | backend-developer | ToDo |
| TASK-013 | Render comments newest-first and move Add-Comment form to top | frontend-developer | ToDo |
| TASK-014 | Update automated tests for newest-first ordering | qa-automation | ToDo |

Dependency order: 001 → 002 → {003, 004}; 005 independent (backend). 003 → 006 → 007 → {008, 009};
005 → 010 (frontend). 011 depends on 001–005.

Newest-first ordering Revision (2026-07-20): 012 (backend, no deps) → 013 (frontend) and 014 (qa);
012/013/014 supersede in part 001/004, 007, and 011 respectively (see the Revision section of
`../implementation_plan.md`). The affected `Done` tasks are annotated but not rewritten.
See `../implementation_plan.md` for the full technical approach and the proposed API surface.
