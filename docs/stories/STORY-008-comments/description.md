---
status: Planned
type: feature
priority: P1
date: 2026-06-28
---

# STORY-008: Work Item Comments

## Desired Outcome
Free-form text notes can be attached to stories or tasks to record observations, decisions, and contextual information inline with the work item. Comments support an optional author role and free-form labels for semantic tagging.

## Context
Comments are the lightweight prose annotation layer. Unlike attachments (which store files or external references), comments store text only and are always immediately visible alongside the work item. Labels allow callers to tag comments with meaning (e.g. "decision", "requires-action", "blocker") without the utility interpreting or acting on those tags.

## Acceptance Criteria
- [ ] A comment can be created on a story or task with required Markdown content (1–50,000 chars), optional free-form `author_role`, and optional free-form labels (key-value pairs)
- [ ] Comments on a story or task can be listed in chronological order (oldest first) with pagination; results can be filtered by label key and label value
- [ ] A comment's content and labels can be updated; updating labels replaces the entire labels array
- [ ] A comment can be deleted
- [ ] Labels on comments are fully free-form — no dictionary validation applies to any label key or value, and `author_role` is never validated against the participant_roles dictionary

## Edge Cases & Error Scenarios
- [ ] Creating a comment with empty content is rejected: "Comment content is required."
- [ ] Updating a comment with an empty labels array removes all its labels — this is valid
- [ ] Deleting a story or task removes all its comments — no orphaned comment records remain
- [ ] Filtering comments by a label key that no comment has returns an empty list, not an error
