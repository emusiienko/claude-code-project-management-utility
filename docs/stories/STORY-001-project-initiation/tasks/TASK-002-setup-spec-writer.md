---
status: Done
assignee: spec-writer
story: STORY-001
---

# TASK-002: Setup — spec-writer

## What to implement
Run the spec-writer Setup workflow: transform the validated business idea into engineering-ready specifications, producing docs/requirements.md and the initial stories index.

## Scope
docs/requirements.md, docs/stories/index.md, docs/stories/STORY-NNN-*/description.md

## Dependencies
TASK-001

## Acceptance Criteria
- [ ] docs/requirements.md created
- [ ] docs/stories/index.md populated with initial stories
- [ ] User has reviewed and approved the specifications

---
## Implementation Report
**Date**: 2026-06-29
**What was done**: Produced docs/requirements.md (index), docs/requirements/requirements_backend.md, and docs/requirements/requirements_web.md from the validated business idea. Created 12 user story files (STORY-002 through STORY-012) following Story Decomposition rules and updated docs/stories/index.md. Added Milestones feature (STORY-012) with M:N project association and optional story assignment (nullable FK). Updated both requirements documents to include Milestones data model, API endpoints, validation rules, and web UI sections. Docker deployment confirmed as target; database provider deferred to architect.
**Deviations from plan**: Story structure was completely redone mid-session after Rule 4 (no tech-stack-based decomposition) was added to spec-writer instructions. Initial stories violated this rule by separating web UI into standalone stories. Corrected to 12 business-capability stories covering full end-to-end scope each. MCP Server moved to end of implementation order at user's explicit request for technical reasons.
**Technical decisions made**: All attachment content (documents and images) stored on server filesystem — not as DB text. AttachmentVersion tracks only document kind. Session incompleteness = both result fields null. Story status is a dedicated field validated against story_statuses dictionary. TaskLinks constrained to same-project pairs. Milestone names unique per associated project (not globally). Removing a project from a milestone's project list is blocked if stories from that project are still assigned to it.
**Code locations**: docs/requirements.md, docs/requirements/requirements_backend.md, docs/requirements/requirements_web.md, docs/stories/index.md, docs/stories/STORY-002 through STORY-012/description.md
**Technical debt noted**: None — story structure is clean and follows all decomposition rules.
