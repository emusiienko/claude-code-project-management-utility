---
status: ToDo
assignee: frontend-developer
story: STORY-008
---

# TASK-009: Comment permalink resolver and deep-linking

## What to implement
Implement the comment permalink deep-linking mechanism, shared by standalone permalinks (Copy link,
TASK-007) and the reply-prefix jump link.

- A resolver route at `/comments/:id` that fetches the comment, reads its `container_type` /
  `container_id`, navigates to the owning host view (story slide-over / task detail modal /
  milestone detail page), ensures the comments section is expanded, and scrolls the target comment
  into view with a brief fading highlight.
- Internal links inside rendered comment Markdown that point at `/comments/:id` resolve via
  client-side routing rather than a full page reload.
- Opening a permalink whose target comment was deleted still navigates to the host view — there is
  simply nothing to scroll to or highlight; this is not an error.
- The absolute URL produced by Copy link (TASK-007) points at this resolver route.

## Scope
The `/comments/:id` resolver route, deep-link navigation with scroll-into-view + highlight, and
internal-link interception in rendered comment Markdown.

## Dependencies
TASK-007.

## Acceptance Criteria
- [ ] Opening a comment permalink navigates to the correct host view with the comments section
  expanded and the target comment scrolled into view and briefly highlighted.
- [ ] The reply-prefix jump link resolves through the same mechanism.
- [ ] Internal `/comments/:id` links in rendered Markdown navigate via client-side routing.
- [ ] A permalink to a deleted comment navigates to the host view without erroring.

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
