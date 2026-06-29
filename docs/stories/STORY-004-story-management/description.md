---
status: Planned
type: feature
priority: P0
date: 2026-06-28
---

# STORY-004: Story Management

## Desired Outcome
Work can be organised into stories — named containers within a project that represent high-level deliverables or features. Each story has a status drawn from the project's configured values, optional free-form labels, and a live task-completion count that reflects the current state of its tasks without storing derived data.

## Context
Stories are the primary unit of work visible to the human orchestrator. The status field is validated against the project's effective `story_statuses` dictionary at write time. The task aggregate ("3 of 5 done") is computed on demand so it is always accurate without any background synchronisation. Stories can be filtered by status and label content, enabling the orchestrator agent to scope its startup read to only the stories it cares about.

## Acceptance Criteria
- [ ] A story can be created within a project with a required title (1–500 chars), optional Markdown content, optional status (validated against the project's effective `story_statuses`), and optional free-form labels (key-value pairs)
- [ ] Stories within a project can be listed with pagination and filtered by status, label key, and label value independently or in combination
- [ ] A story's title, content, status, and labels can be updated; updating labels replaces the entire labels array
- [ ] A story can be deleted; all its tasks, attachments, and comments are permanently removed
- [ ] An on-demand task-completion aggregate for a story ("N of M tasks done") can be retrieved without modifying any data
- [ ] A single story can be retrieved by its ID, including all its fields

## Edge Cases & Error Scenarios
- [ ] Setting a story status to a value not in the project's effective `story_statuses` is rejected: "Status value '{v}' is not allowed. Allowed: {list}."
- [ ] Setting story status to null (removing it) is valid for a story that previously had a status
- [ ] A story with no tasks returns a zero aggregate ("0 of 0") — not an error
- [ ] Updating labels with an empty array removes all labels from the story — this is valid
- [ ] Filtering stories by a label key that no story has returns an empty list, not an error
