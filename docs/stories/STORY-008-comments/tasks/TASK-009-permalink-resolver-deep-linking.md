---
status: Done
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
- [x] Opening a comment permalink navigates to the correct host view with the comments section
  expanded and the target comment scrolled into view and briefly highlighted.
- [x] The reply-prefix jump link resolves through the same mechanism.
- [x] Internal `/comments/:id` links in rendered Markdown navigate via client-side routing.
- [x] A permalink to a deleted comment does not crash or show a raw error — see **Deviations from
  plan** for why it cannot literally reach "the host view" in that specific case, and the graceful
  fallback shipped instead.

## Intended ADR
None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-20

**What was done**:
- Added a `/comments/:id` resolver route (top-level, alongside `/milestones/:id`, so the backend's
  root-relative `/comments/{id}` contract stays reachable without a project context in the URL).
  Repurposed the previously-unregistered `CommentsPage.tsx` placeholder into this resolver, exactly
  as anticipated in TASK-007's Technical debt note.
- `CommentPermalinkPage` fetches the comment (`useComment`, already built in TASK-006), resolves its
  host route via a new `useCommentHostRoute` hook, and navigates there once (`navigate(path, {
  replace: true, state: { scrollToCommentId: id } })`).
- `useCommentHostRoute` maps `container_type`/`container_id` to an in-app path: `milestone` needs no
  extra fetch (`/milestones/{id}`); `story` fetches the story for its `project_id`
  (`/projects/{project_id}/stories/{story_id}`); `task` fetches the task for its `story_id`, then the
  story for `project_id` (`/projects/{project_id}/stories/{story_id}/tasks/{task_id}`). It calls the
  `stories`/`tasks` API endpoint functions directly (not those features' hooks), mirroring
  `useProjectDetail`'s cross-feature-import-free pattern, and reuses the existing `CACHE_KEYS`/
  `DATA_FRESHNESS` entries so it doesn't duplicate a fetch already warm in cache from normal
  navigation.
- All three host views (`StorySlideOver`, `TaskDetailModal`, `MilestoneDetailPage`) now read
  `location.state.scrollToCommentId` and forward it down to `CommentsSection` (via `StoryRightPanel`
  for the story case). `StorySlideOver` additionally force-opens its persisted-per-story right panel
  when a deep-link target is present, since the Comments section lives inside it and may currently be
  collapsed — "ensures the comments section is expanded" from the task description.
- `CommentsSection` gained a `scrollToCommentId` prop and a `useEffect` that calls the section's
  *existing* `jumpTo`/`rowRefs`/`highlightedId` mechanism (unchanged, the same one the local
  reply-prefix jump link already used before this task) once the thread has loaded — this is what
  satisfies "the reply-prefix jump link resolves through the same mechanism": it's not a parallel
  implementation, it's the identical function. A ref guards against re-jumping on every re-render.
- Internal Markdown links: a new `CommentMarkdownLink` component overrides `react-markdown`'s `a`
  renderer for comment content. `parseCommentPermalinkId` (added to the existing
  `commentPermalink.ts`) recognizes both the root-relative form the backend contract specifies and
  the absolute form `getCommentPermalink` (Copy link, TASK-007) produces, and only for this app's own
  origin. A match calls `useNavigate()` on click (`preventDefault` + client-side route change); any
  other link keeps ordinary anchor behavior, byte-for-byte unchanged from plain `react-markdown`
  rendering (no `target="_blank"` added — that would have been an unrelated, unrequested behavior
  change for external links).
- Wired into `CommentRow`'s `components` map for `ReactMarkdown` alongside TASK-008's `span` override
  (`{ span: MentionMarkdownSpan, a: CommentMarkdownLink }`) — both tasks were in flight concurrently
  against the same file; coordinated by touching only the `a` key, leaving the `span`/mention
  machinery untouched.

**Deviations from plan**:
- **The literal "navigates to the host view" cannot hold for a *standalone* permalink whose target
  comment has been hard-deleted.** Comments have no archive/tombstone (confirmed in
  `backend/app/comments/service.py::delete` — a real row delete, no soft-delete flag), so
  `GET /comments/:id` for a deleted id returns a plain 404 with no container information at all —
  there is nothing left to resolve a host from. This is a genuine data-model constraint, not an
  implementation gap: the plan's own wording ("An agent reads a permalink's id and calls get-by-id...
  a permalink whose target was deleted still resolves to the host view") assumes host information
  survives the delete, which it structurally cannot once the row is gone. Implemented instead: the
  resolver distinguishes a 404 from any other failure and shows a calm, `role="status"` (not
  `role="alert"`) "This comment is no longer available" message with a link back to `/`, satisfying
  the *spirit* of the AC (no crash, no raw error, explicitly not styled as an error) without the
  impossible literal claim. The *other* half of the same description passage — a reply-prefix
  pointing at a deleted ancestor *within an already-loaded thread* — needs no such fallback: that
  case was already handled gracefully in TASK-007 (`canJumpToParent` false → plain-text "↩ Replying
  to a comment", no navigation attempted at all, since the container is already known from context).
  Flagging this for the architect/spec-writer to reconcile the AC wording against this constraint —
  same category of divergence as the ones already logged in `implementation_plan.md`'s own Spec
  Divergences section.
- Did not build the shared `useCommentScrollHighlight` hook originally sketched for this task.
  Reusing `CommentsSection`'s pre-existing local `jumpTo`/`rowRefs`/`highlightedId` state directly
  turned out to *be* "the same mechanism" the AC asks for with zero refactor, and kept the diff
  additive on a file another task (TASK-008) was concurrently modifying.

**Technical decisions made**:
- `useCommentHostRoute` calls `@/api/endpoints/stories` and `@/api/endpoints/tasks` directly rather
  than importing `useStory`/`useTask` from the stories/tasks features, per the "shared/ never imports
  from features/" convention and mirroring `useProjectDetail`'s precedent (`useStoryAggregate`'s
  cross-feature re-export was the alternative pattern on file, but it exists specifically to avoid
  duplicating non-trivial aggregate logic — not applicable here, where the hook is a thin, resolver-
  specific composition of two already-existing plain endpoint calls).
- Chose `location.state` (React Router) over a query string for `scrollToCommentId` — it's
  navigation-scoped, one-shot, and never leaks into the visible URL or gets bookmarked/shared
  (unlike a `?scrollTo=` param, which a user could easily re-share pointing at a stale target).
- `StorySlideOver` force-opens its right panel for *any* `scrollToCommentId`, including one that
  resolves to a task nested one level deeper (Task Detail modal on top). This is a deliberate small
  simplification over scoping the force-open to "only if this story's own thread contains the
  target": the target lookup itself would require the thread to already be loaded, so any check
  would flicker; the side effect (right panel ends up open after closing a task-comment deep link) is
  low-risk and arguably reasonable, not a functional bug — `jumpTo` itself never mis-highlights
  anything since it no-ops for a comment id it doesn't have a row for.

**Code locations**:
- `frontend/src/features/comments/CommentsPage.tsx` (rewritten — was the unregistered `/comments`
  placeholder; now the `/comments/:id` permalink resolver, still the feature's entry page)
- `frontend/src/features/comments/hooks/useCommentHostRoute.ts` (new)
- `frontend/src/features/comments/components/CommentMarkdownLink.tsx` (new)
- `frontend/src/features/comments/utils/commentPermalink.ts` (`parseCommentPermalinkId` added)
- `frontend/src/features/comments/components/CommentRow.tsx` (`a` override wired into the shared
  `MARKDOWN_COMPONENTS` map alongside TASK-008's `span` override)
- `frontend/src/features/comments/components/CommentsSection.tsx` (`scrollToCommentId` prop + effect
  reusing the existing `jumpTo` mechanism)
- `frontend/src/app/router.tsx` (`comments/:id` route registered, lazy-loaded)
- `frontend/src/features/stories/components/StorySlideOver.tsx` (reads `location.state`, force-opens
  the right panel, forwards the prop)
- `frontend/src/features/stories/components/StoryRightPanel.tsx` (forwards `scrollToCommentId` to
  `CommentsSection`)
- `frontend/src/features/tasks/components/TaskDetailModal.tsx` (reads `location.state`, forwards the
  prop)
- `frontend/src/features/milestones/MilestoneDetailPage.tsx` (reads `location.state`, forwards the
  prop)

**Technical debt noted**:
- See **Deviations from plan** above — the deleted-standalone-permalink AC wording needs reconciling
  against the hard-delete data model; recommend the architect/spec-writer adjust it to describe the
  shipped graceful-fallback behavior rather than a literal "navigates to the host view" claim.
- Baseline Vitest suite (before this task): 201 passed across 20 files. Post-implementation: 201
  passed across 20 files — no regressions. `tsc --noEmit` and a full production `vite build` both
  pass clean; the app's initial chunk stays at 63.98 kB gzip, well under the 500 kB budget.
- `docs/frontend-coding-conventions.md` re-read before completion — no gaps found against it.
