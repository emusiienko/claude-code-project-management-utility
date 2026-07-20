---
status: ToDo
assignee: frontend-developer
story: STORY-008
---

# TASK-013: Render comments newest-first and move the Add-Comment form to the top

## What to implement
Align the Comments UI with the newest-first ordering delivered by TASK-012. See the **Revision —
Comment ordering is newest-first** section of `implementation_plan.md`.

- The `CommentsSection` thread renders in the order the API returns (now newest-first), so the newest
  comment appears at the top and the oldest at the bottom. Do not re-sort or reverse client-side — the
  server owns the order (a client-only reversal breaks under pagination).
- A newly-created comment must appear at the **top** of the thread after the list refetches on
  successful create — the natural result of newest-first server order, so this should require no
  special handling beyond the existing invalidate/refetch. Verify it lands at the top, not the bottom.
- Move the pinned **Add-Comment form to the top** of the section, above the thread, so the author
  composes at the top and their new comment appears directly beneath it. This replaces the current
  bottom placement. The form's own behavior is otherwise unchanged: `author_role` pre-fill from the
  effective default, submit disabled until content and author_role are present, inline per-field
  errors, and full reset (re-applying the default) on success.
- Everything else is order-independent and must keep working unchanged: the reply-prefix jump link,
  the reply "replying to" chip, the `@role` mention combobox and render-time highlighting, comment
  permalink copy/resolve + scroll-into-view + highlight, the live count badge, and the inline
  Edit / Reply / Delete / Copy-link actions.

## Scope
Comments feature UI — the `CommentsSection` render order and the Add-Comment form position across all
three host mounts (story right panel, task detail modal, milestone detail page). No API-client or
hook changes are expected (the order comes from the server).

## Dependencies
TASK-012 (the API must return newest-first first). Supersedes in part the ordering/form-placement
behavior of TASK-007; that `Done` task is not modified.

## Acceptance Criteria
- [ ] The thread renders newest-first on all three hosts (story, task, milestone).
- [ ] A newly-created comment appears at the top of the thread on success.
- [ ] The Add-Comment form is pinned above the thread; its pre-fill, disabled-state, inline-error,
  and reset behaviors are unchanged.
- [ ] Reply chip + reply-prefix jump link, `@role` combobox and highlighting, permalink
  copy/resolve/scroll-highlight, count badge, and Edit/Reply/Delete/Copy-link actions all still work.
- [ ] `tsc --noEmit` and the production build pass; the existing frontend test suite stays green
  (update any test that asserts the old bottom-append / oldest-first order).

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
