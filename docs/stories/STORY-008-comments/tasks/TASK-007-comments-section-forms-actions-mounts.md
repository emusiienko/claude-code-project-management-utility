---
status: ToDo
assignee: frontend-developer
story: STORY-008
---

# TASK-007: CommentsSection with forms, actions, and host mounts

## What to implement
Build a reusable `CommentsSection` (mirroring the attachments section) and mount it in the three
host views.

- A section parameterized by container type / id / project, rendering the thread oldest-first. Each
  entry shows the author role, the `content` rendered as Markdown, its label chips, a timestamp,
  and — when the comment is a reply (non-empty `ancestors`) — a reply-prefix line "↩ Replying to
  {author_role}" derived from the direct parent (`ancestors[-1]`, looked up in the loaded thread),
  acting as a jump link (resolution handled in TASK-009).
- A live count badge on the section heading, matching the attachments convention.
- Per-comment inline actions: **Edit**, **Reply**, **Delete**, **Copy link**. Delete uses the
  standard destructive-confirmation dialog. Edit switches the entry to an inline form for `content`
  and `labels` only, with `author_role` shown read-only. Reply sets the reply target for the compose
  form via a dismissible "replying to" chip. Copy link copies the comment's absolute permalink and
  shows the standard toast.
- A pinned Add-Comment form at the bottom: an `author_role` free-form text input pre-filled from the
  effective `default_web_ui_role`; a required Markdown `content` textarea; the existing key/value
  labels editor; submit disabled while `content` or `author_role` is empty; inline per-field errors
  on a failed attempt. On success the new comment appears at the bottom, and the form resets —
  content/labels cleared and `author_role` re-applied from the effective default.
- Mount the section in the story right panel, the task detail modal, and the milestone detail page
  (replacing that page's "Deferred to STORY-008" placeholder).

## Scope
Comments feature UI: the reusable section, its Add/Edit forms and inline actions, and the three host
mounts. The `@role` combobox (TASK-008) and permalink resolution (TASK-009) integrate on top.

## Dependencies
TASK-006.

## Acceptance Criteria
- [ ] The section renders the thread oldest-first with author role, Markdown content, label chips,
  timestamp, and a count badge, on all three hosts.
- [ ] A reply shows a "↩ Replying to {author_role}" prefix derived from `ancestors[-1]`; the thread
  stays flat (no nesting/indentation).
- [ ] Add-Comment pre-fills `author_role` from the effective default, disables submit until content
  and author_role are present, shows inline errors, and resets (re-applying the default) on success.
- [ ] Edit updates content and labels only, with author_role read-only; Delete confirms; Reply sets
  a dismissible reply chip; Copy link copies the permalink and toasts.
- [ ] The milestone detail page's placeholder is replaced by the live section.

## Intended ADR
None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**:
**What was done**:
**Deviations from plan**:
**Technical decisions made**:
**Code locations**:
**Technical debt noted**:
