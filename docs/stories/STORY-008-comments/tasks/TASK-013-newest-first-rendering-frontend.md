---
status: Done
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
- [x] The thread renders newest-first on all three hosts (story, task, milestone).
- [x] A newly-created comment appears at the top of the thread on success.
- [x] The Add-Comment form is pinned above the thread; its pre-fill, disabled-state, inline-error,
  and reset behaviors are unchanged.
- [x] Reply chip + reply-prefix jump link, `@role` combobox and highlighting, permalink
  copy/resolve/scroll-highlight, count badge, and Edit/Reply/Delete/Copy-link actions all still work.
- [x] `tsc --noEmit` and the production build pass; the existing frontend test suite stays green
  (update any test that asserts the old bottom-append / oldest-first order).

## Intended ADR
None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-20
**What was done**: `CommentsSection` (the single component mounted identically on all three hosts —
story right panel, task detail modal, milestone detail page — so no host-specific changes were
needed) was reordered so the pinned Add-Comment form now renders first, immediately after the
header/loading/error states, followed by the empty-state message and then the comment thread `<ul>`.
No sorting logic was added or removed anywhere — the thread already rendered `comments` (from
`useCommentList`, itself unchanged) in server order with no client-side `.sort()`/`.reverse()`, so
once TASK-012 flipped the API's `ORDER BY`, the thread became newest-first "for free"; the only real
work was the JSX reordering plus adjusting `handleReply`'s `scrollIntoView` call from
`block: "end"` to `block: "start"` since the form it targets now sits at the top of the section
instead of the bottom. Updated stale "oldest-first" / "bottom" wording in JSDoc comments on
`CommentsSection`, `AddCommentForm`, `useCommentList`, and the `listComments` endpoint function to
match the new reality (docs-only, no behavior change). Verified new-comment-at-top and all
order-independent features (reply chip, reply-prefix jump link, `@role` combobox + highlighting,
permalink copy/resolve/scroll-highlight, count badge, Edit/Reply/Delete/Copy-link actions) by
reading through `CommentsSection`, `CommentRow`, `AddCommentForm`, and `commentPermalink.ts` — none
of that logic reads or depends on list order, so it needed no changes and none were made.
**Deviations from plan**: One judgment call beyond the task's explicit instructions: also moved the
"No comments yet." empty-state message to render after the form (it previously rendered before the
thread, which — now that the form sits above the thread — would have visually sandwiched the empty
message between the header and the form). This keeps the empty state grouped with the thread block
it describes rather than floating above the form. Not called out in the task file, but consistent
with its intent ("form pinned above the thread") and covered by the same manual review + full test
suite pass.
**Technical decisions made**: None beyond the reordering itself — no new state, hooks, or API calls
were introduced. `scrollIntoView({ block: "start" })` was chosen over leaving `"end"` unchanged
because the form is now a top-anchored element; `"start"` aligns its top edge to the viewport, matching
how a user would expect the page to scroll when clicking Reply from deep in the thread.
**Code locations**: `frontend/src/features/comments/components/CommentsSection.tsx` (JSX reorder +
`handleReply` scroll target + JSDoc); `frontend/src/features/comments/components/AddCommentForm.tsx`
(JSDoc only); `frontend/src/features/comments/hooks/useComments.ts` (JSDoc only);
`frontend/src/api/endpoints/comments.ts` (JSDoc only). No changes to `CommentRow.tsx`,
`MentionTextarea.tsx`, `commentPermalink.ts`, `useMentionCombobox.ts`, or any of the three host mount
files (`StoryRightPanel.tsx`, `TaskDetailModal.tsx`, `MilestoneDetailPage.tsx`) — they all consume
`CommentsSection` as a black box and needed no edits.
**Technical debt noted**: None introduced. Pre-existing stale wording remains in
`docs/stories/STORY-008-comments/description.md` (spec-writer-owned; flagged in
`implementation_plan.md`'s "Spec follow-up" note for spec-writer to update at Reconcile — not edited
here per document ownership). No dedicated automated test file exists for `CommentsSection` itself
(the only frontend test touching it, `StorySlideOver.test.tsx`, mocks `useCommentList` with an empty
list and doesn't assert ordering); TASK-014 (qa-automation) owns the automated-test side of this
revision and is tracked separately.
