---
status: Planned
type: feature
priority: P0
date: 2026-06-28
---

# STORY-002: Settings

## Desired Outcome
The orchestrator and agents can configure the allowed values for task statuses, task types, story statuses, attachment types, link types, and participant roles — both at system level (defaults for all projects) and per project (overrides for that project only). A new project works immediately with system defaults, requiring no mandatory configuration.

## Context
Settings are the vocabulary foundation for the entire utility. All dictionary-validated fields in Stories, Tasks, Attachments, and Task Links reference these values at write time. Project-level overrides completely replace (not merge with) the system default for that key. The utility ships with sensible system defaults so the orchestrator can start recording work without any upfront configuration.

## Acceptance Criteria
- [ ] System-level defaults can be viewed for all six dictionary keys: `task_statuses`, `task_types`, `story_statuses`, `attachment_types`, `link_types`, `participant_roles`
- [ ] System-level defaults can be updated for any dictionary key; the change applies immediately to all projects that have no override for that key
- [ ] A project-level override can be set for any dictionary key; once set, the project's effective value for that key becomes the override, completely replacing the system default
- [ ] The effective settings for a project (system defaults merged with project overrides) can be retrieved in a single call
- [ ] A project override for a specific key can be cleared, restoring the system default for that key without affecting other keys
- [ ] A project with no overrides whatsoever returns system defaults as its effective settings — no configuration step is required before use

## Edge Cases & Error Scenarios
- [ ] Setting an empty array for any dictionary key is rejected: "Dictionary values cannot be empty."
- [ ] Updating one project's override does not affect another project's effective settings
- [ ] Clearing a project override for one key leaves overrides for other keys untouched
- [ ] Requesting effective settings for a non-existent project returns 404
