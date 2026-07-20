## Active wait
waiting_for: STORY-008 implementation — Round 4 (TASK-006, TASK-011) running in parallel
next_step: on completion, Round 5 (TASK-007)

## STORY-004 design notes
- Plan confirmed, no revision — implementation can start
- SESSION-009 completed: labels = free-form {key,value}, settings dicts = fixed set of 6, status only dict-bound field on story

## Recent changes
- 2026-07-19: SESSION-016 completed — architect Feature Design for STORY-008: implementation_plan.md + 11 task files (5 backend/4 frontend/1 qa-automation); replies use persisted materialized ancestor path (architect's call, diverges from spec's schema-free prepend model — flagged as Spec Divergence); open item: description.md needs spec-writer pass to strip reply-mechanism implementation prescription
- 2026-07-19: SESSION-015 completed — STORY-008 spec expanded (mandatory+immutable author_role, new default-role setting, @role mentions, permalinks/reply via in_reply_to, milestone container added); still Planned, ready for architecture
- 2026-07-02: STORY-013 accepted; STORY-001 + STORY-013 fully reconciled and archived
- 2026-07-02: STORY-014 (Docker uv) accepted and fully reconciled
- 2026-07-03: SESSION-007 completed — STORY-002 code review continuation (major refactor: fastmcp, routing, DI, file structure)
- 2026-07-03: API contract updated — Pydantic validation errors now 422
- 2026-07-03: SESSION-008 created — frontend-developer code review + conventions update
- 2026-07-04: SESSION-008 completed — frontend restructured to Feature-Sliced Design (features/ dir, 3-layer API arch, new config layout); conventions updated
- 2026-07-06: STORY-003 accepted and fully reconciled — ADR-010 (migrations), ADR-011 (UUID coercion + validation placement); archived
- 2026-07-06: STORY-015 accepted and fully reconciled — Lucide icons on Projects + Settings, IconButton primitive, Vitest frontend test suite (27 tests)
- 2026-07-06: Code review conventions established: no Response/Body schema suffixes (backend + frontend), UUID coercion in BaseRepository, field validation in Pydantic schemas, DomainError.to_tool_error()
- 2026-07-10: STORY-016 (Navigation & UX Redesign) fully reconciled — ADR-014 (app switcher shell), requirements_web.md updated, 30 new frontend tests (140 total), TC-023–TC-034 merged into master QA registry; archived
- 2026-07-11: STORY-012 (Milestones) accepted and fully reconciled — ADR-015 (single-project model), ADR-016 (single-active service invariant), requirements updated, 350 tests total, TC-035–TC-052 merged; archived
- 2026-07-11: STORY-017 (Board Milestone Filter Combobox) accepted and fully reconciled — useActiveMilestone hook removed (orphan), TC-042/043 updated, requirements_web.md updated; archived
- 2026-07-11: STORY-005 Feature Design complete — spec updated, plan approved (useBoardDrag promoted to shared/hooks, no generic KanbanBoard component); 7 tasks ready for implementation
- 2026-07-14: SESSION-014 completed — STORY-007 plan review with architect; api-contract v1.5 (versioning + archive removed, attachments immutable create+delete, new `file` kind, MCP base64 binary create/read, in-app viewer, `author_role` moved to Attachment); implementation_plan.md, task files, api-contract.md, architecture.md, CLAUDE.md updated by architect. Spec-writer to-do pending to bring requirements docs in line with v1.5.
- 2026-07-15: STORY-007 (Work Item Attachments) implemented, QA-passed (4 bug-fix rounds, last one a structural fix — shared `useModalEscape` modal-stack hook), accepted, and fully reconciled (ADR-020, ADR-021; requirements updated; TC-110–TC-132 merged); archived.
- 2026-07-15: STORY-021 (Attachment Title Field) created as a design follow-up — replaced Attachment's dictionary-bound `type` with a mandatory free-form `title` (autofill from filename on upload, editable); retired the `attachment_types` Settings dictionary (six → five keys). Implemented, QA-passed with zero bugs, accepted, and fully reconciled (api-contract v1.6, no ADR — spec-driven refinement; TC-133–TC-138 merged, TC-131 retired as superseded); archived.
