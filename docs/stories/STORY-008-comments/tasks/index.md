# STORY-008 — Tasks

| ID | Title | Assignee | Status |
|----|-------|----------|--------|
| TASK-001 | Comment model, migration, and repository | backend-developer | Done |
| TASK-002 | Comment service and schemas | backend-developer | Done |
| TASK-003 | Comment REST controller, MCP tools, and DI wiring | backend-developer | Done |
| TASK-004 | Detail composition and cascade delete | backend-developer | Done |
| TASK-005 | default_web_ui_role setting and operator seed | backend-developer | Done |
| TASK-006 | Comments API client and hooks | frontend-developer | Done |
| TASK-007 | CommentsSection with forms, actions, and host mounts | frontend-developer | ToDo |
| TASK-008 | @role mention combobox and render highlighting | frontend-developer | ToDo |
| TASK-009 | Comment permalink resolver and deep-linking | frontend-developer | ToDo |
| TASK-010 | Default Web UI role settings UI | frontend-developer | Done |
| TASK-011 | Automated tests for comments and the new setting | qa-automation | Done |

Dependency order: 001 → 002 → {003, 004}; 005 independent (backend). 003 → 006 → 007 → {008, 009};
005 → 010 (frontend). 011 depends on 001–005.
See `../implementation_plan.md` for the full technical approach and the proposed API surface.
