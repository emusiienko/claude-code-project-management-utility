---
status: Done
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
- [x] The section renders the thread oldest-first with author role, Markdown content, label chips,
  timestamp, and a count badge, on all three hosts.
- [x] A reply shows a "↩ Replying to {author_role}" prefix derived from `ancestors[-1]`; the thread
  stays flat (no nesting/indentation).
- [x] Add-Comment pre-fills `author_role` from the effective default, disables submit until content
  and author_role are present, shows inline errors, and resets (re-applying the default) on success.
- [x] Edit updates content and labels only, with author_role read-only; Delete confirms; Reply sets
  a dismissible reply chip; Copy link copies the permalink and toasts.
- [x] The milestone detail page's placeholder is replaced by the live section.

## Intended ADR
None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-20

**What was done**:
Built the full Comments UI on top of TASK-006's data layer and mounted it in all three host views:

- `frontend/src/features/comments/components/CommentsSection.tsx` (new) — the reusable orchestrator.
  Fetches the container's comment list (`useCommentList`), renders it oldest-first with a live count
  badge (matching `AttachmentsSection`'s badge convention exactly), owns all local UI state (which
  row is being edited, the current reply target, the pending-delete comment, a toast message, and a
  `formResetKey` used to remount — and thereby reset — the Add-Comment form after a successful
  submit), and wires the three mutations (`useCreateComment`/`useUpdateComment`/`useDeleteComment`).
  Reply-prefix jump links resolve locally: each `CommentRow` registers its DOM node in a ref map keyed
  by comment id, and clicking a reply-prefix scrolls the direct parent into view and applies a
  momentary highlight (2s) if that parent is present in the currently loaded thread; if not (out of
  the loaded page), the prefix degrades to plain, non-interactive text reading "↩ Replying to a
  comment" — consistent with the app's existing "target may be gone, degrade gracefully" precedent
  for permalinks. Reads `default_web_ui_role` from `useProjectSettingsEffective(projectId)`, imported
  directly from `@/features/settings/hooks/useProjectSettings` the same way `TaskLinksSection` already
  does (an established cross-feature hook-import precedent distinct from the component-visibility
  rule, which only restricts *components*).
- `frontend/src/features/comments/components/CommentRow.tsx` (new) — a single thread entry. Read mode
  shows the optional reply-prefix line, author role + timestamp, Markdown content (via
  `react-markdown` and the new shared `MARKDOWN_CONTENT_CLASS`), label chips (styled identically to
  `TaskCard`'s label chips), and four `IconButton` actions (Edit/Reply/Copy link/Delete, Lucide
  `Pencil`/`Reply`/`Link2`/`Trash2`). Edit mode swaps the row for `EditCommentForm`.
- `frontend/src/features/comments/components/EditCommentForm.tsx` (new) — inline content+labels editor,
  mounted only while its row is in edit mode (so its local state is always freshly seeded from the
  comment being edited — no reset effect needed, unlike the Add form). `author_role` is rendered as
  read-only text, never an input.
- `frontend/src/features/comments/components/AddCommentForm.tsx` (new) — the pinned compose form
  (always visible, not toggled open/closed like the Attachments "Add" panel, per the description's
  "pinned Add-Comment form"). `author_role` pre-fills from `authorRoleDefault` and stays synced to it
  via an untouched-tracking effect (covers the default settings query resolving asynchronously after
  first mount) until the user edits the field, mirroring `UploadAttachmentPanel`'s
  file-name-title-prefill idiom. Shows a dismissible "↩ Replying to {author_role}'s comment" chip when
  a reply target is set; content is never pre-seeded with reply link text, per the plan's "reply chip,
  not text injection" model. Submit is disabled until both `content` and `author_role` are non-empty.
- `frontend/src/features/comments/components/DeleteCommentDialog.tsx` (new) — permanent-delete
  confirmation, structurally identical to `DeleteAttachmentDialog` (`alertdialog`, Escape-to-cancel,
  backdrop click, disabled-while-pending, inline error).
- `frontend/src/features/comments/utils/errorMessages.ts` (new) — `extractErrorMessage`/
  `extractFieldErrors`, byte-identical to the attachments/tasks/milestones/stories/projects copies —
  following this codebase's established per-feature convention rather than introducing a one-off
  shared version (see Convention Gaps below).
- `frontend/src/features/comments/utils/commentPermalink.ts` (new) — `getCommentPermalink(id)` builds
  `${window.location.origin}/comments/{id}`, per the plan's "root-relative on the wire, absolute only
  on copy" contract. The `/comments/:id` resolver route itself is TASK-009's scope.
- Mounted `CommentsSection` in all three hosts, replacing the STORY-008 placeholders/gaps:
  - `frontend/src/features/stories/components/StoryRightPanel.tsx` — replaced the "Comments coming
    soon" placeholder `<section>`.
  - `frontend/src/features/tasks/components/TaskDetailModal.tsx` — replaced the "Task comments —
    coming in STORY-008" placeholder `<section>`.
  - `frontend/src/features/milestones/MilestoneDetailPage.tsx` — added directly below the Attachments
    section. (No literal "Deferred to STORY-008" placeholder text existed in this file's current
    state to remove — the milestone detail view simply had no Comments section at all — so this is
    purely additive; the requirement's substance, a live Comments section on the page, is met.)

Two small pieces of shared infrastructure were promoted/created because they're now used by two or
more features (or, for the toast, didn't exist at all yet):
- `frontend/src/shared/utils/formatTimestamp.ts` — promoted from `features/attachments/utils/` (its
  sole prior owner) since Comments needed the identical formatter; `AttachmentRow.tsx`'s import was
  updated, the old feature-local file removed.
- `frontend/src/shared/utils/markdownStyles.ts` (`MARKDOWN_CONTENT_CLASS`) — extracted from
  `StoryRightPanel`'s inline Tailwind arbitrary-property class list (the one place in the app that
  correctly renders `react-markdown` output without the absent `@tailwindcss/typography` plugin) so
  Comments could reuse it verbatim. `StoryRightPanel`'s own inline usage was left untouched (out of
  this task's scope) — only my new code consumes the extracted constant.
- `frontend/src/shared/hooks/useToast.ts` + `frontend/src/shared/components/Toast.tsx` (new) — the
  app's first toast implementation. No toast component or store existed anywhere in the codebase
  despite `docs/frontend-coding-conventions.md`/the story's UI/UX spec both saying "consistent with
  the app's existing toast pattern" — grepped the whole `frontend/src` tree to confirm before
  building. Implemented as a small local hook (`useToast`) rather than a global context/store, per the
  "no global client state store" convention — Copy Link is the only trigger site today and it lives
  entirely inside `CommentsSection`'s own tree, so no cross-tree state sharing is needed.

**Deviations from plan**: None from the implementation plan's Frontend section. Two points on how the
already-diverged backend surface (Model-B replies, documented in the plan's own "Spec Divergences")
were exposed in the UI:
- The reply-prefix "jump link" is fully interactive today (scroll + highlight) when the parent is in
  the loaded thread, rather than an inert placeholder — the plan explicitly names this as the shared
  mechanism TASK-009 builds on ("resolves through the same permalink scroll-and-highlight mechanism"),
  so building the local half of it now (rather than stubbing it) sets up TASK-009 to extend rather
  than replace it.
- Reply chip wording is "↩ Replying to {author_role}'s comment" (from the plan's own UI/UX section),
  not the `description.md` original's link-insertion behavior — already called out as a Spec
  Divergence in `implementation_plan.md`, not a new one introduced here.

**Technical decisions made**:
- **Only one comment can be in edit mode at a time**, and edit/delete/create all share a single
  mutation instance per action type (not one per row) — state (`editingId`, `pendingDelete`,
  `formResetKey`) lives in `CommentsSection` and is threaded down as props, mirroring
  `AttachmentsSection`'s single-`isAdding`-flag pattern. This keeps the update mutation's `isPending`/
  error state meaningful without per-row mutation instances.
- **Add-Comment form reset uses a remount-via-`key` pattern** (`formResetKey`, incremented on create
  success) rather than an imperative ref/effect-driven reset — the cleanest way in React to fully reset
  a form's internal state (content, labels, and the author-role-touched flag all revert to fresh
  initial values) without introducing `useImperativeHandle` or fragile effect-ordering.
- **Reply-prefix parent resolution is a plain-object lookup against the already-loaded thread**
  (`commentsById.get(ancestors[ancestors.length-1])`), not a fetch of `GET /comments/:id/ancestors` —
  consistent with the plan's "~50 comments, one page, look up locally" volume assumption. The ancestors
  endpoint (already client-side via `useCommentAncestors` from TASK-006) remains available for a future
  need (e.g. TASK-009 resolving a permalink to a comment whose container isn't loaded yet) but isn't
  needed for this task's in-thread jump link.
- **`formatTimestamp` and the markdown-content class list were promoted to `shared/`**, matching the
  DRY principle in the persona instructions ("Duplication is not acceptable even for 'small' things")
  for *new* code — `errorMessages.ts` was deliberately left as a per-feature copy instead (see
  Convention Gaps) since that duplication is a pervasive, pre-existing pattern across five other
  features and de-duplicating it is a larger, unrequested refactor outside this task's scope.

**Code locations**:
- `frontend/src/features/comments/components/CommentsSection.tsx` (new)
- `frontend/src/features/comments/components/CommentRow.tsx` (new)
- `frontend/src/features/comments/components/EditCommentForm.tsx` (new)
- `frontend/src/features/comments/components/AddCommentForm.tsx` (new)
- `frontend/src/features/comments/components/DeleteCommentDialog.tsx` (new)
- `frontend/src/features/comments/utils/errorMessages.ts` (new)
- `frontend/src/features/comments/utils/commentPermalink.ts` (new)
- `frontend/src/shared/utils/formatTimestamp.ts` (new — promoted from
  `frontend/src/features/attachments/utils/formatTimestamp.ts`, which was removed)
- `frontend/src/shared/utils/markdownStyles.ts` (new)
- `frontend/src/shared/hooks/useToast.ts` (new)
- `frontend/src/shared/components/Toast.tsx` (new)
- `frontend/src/features/attachments/components/AttachmentRow.tsx` (import path updated only)
- `frontend/src/features/stories/components/StoryRightPanel.tsx` (mounts `CommentsSection`)
- `frontend/src/features/tasks/components/TaskDetailModal.tsx` (mounts `CommentsSection`)
- `frontend/src/features/milestones/MilestoneDetailPage.tsx` (mounts `CommentsSection`)
- `frontend/src/features/stories/components/StorySlideOver.test.tsx` (added `useComments` hook mocks —
  see Technical debt noted)

**Technical debt noted**:
- `frontend/src/features/stories/components/StorySlideOver.test.tsx` required updating: mounting
  `CommentsSection` inside `StoryRightPanel` introduced a `useCommentList` call that needs a
  `QueryClientProvider`, exactly the same class of dependency `AttachmentsSection`/`TaskLinksSection`/
  etc. already have there. Added a `vi.mock("@/features/comments/hooks/useComments", …)` block and
  matching `beforeEach` return values, following the file's existing per-feature-hook mocking pattern
  precisely — a regression fix required by this task's own change, not a new gap.
- `frontend/src/features/comments/CommentsPage.tsx` (the standalone `/comments` placeholder route,
  unrelated to the three host mounts and not currently registered in `router.tsx`) was left untouched —
  out of this task's scope; likely repurposed by TASK-009 as the permalink resolver page.
- Baseline Vitest suite (before this task): 201 passed across 20 files. Post-implementation: 201
  passed across 20 files (after the `StorySlideOver.test.tsx` mock update above) — no regressions.
  `tsc --noEmit` and a full production `vite build` both pass clean.
- `docs/frontend-coding-conventions.md` re-read before completion — no gaps found against it directly;
  see Convention Gaps below for two informational observations.

**Convention Gaps** *(informational only — no `frontend-coding-conventions.md` change made)*:
- Neither the conventions doc nor any prior story actually shipped a toast component before this task,
  despite both the conventions ("standard toast") and `description.md`/`implementation_plan.md`
  ("consistent with the app's existing toast notification pattern") referring to one as if it already
  existed. Confirmed via a full-tree grep before building. `useToast`/`Toast` (documented above) are
  now that pattern's first implementation — future toast-triggering features should reuse them rather
  than growing a second one.
- `errorMessages.ts` (`extractErrorMessage`/`extractFieldErrors`) is duplicated verbatim across six
  features now (attachments, tasks, milestones, stories, projects, and now comments) with no shared
  version. Pre-existing pattern, not introduced by this task, but the count is worth flagging for a
  future dedicated cleanup pass.
- The `CommentsSection` chunk (`vite build` output) is the largest lazy chunk in the app (~46.6 kB
  gzip), noticeably larger than the `StorySlideOver`/`TaskDetailModal` chunks that also use
  `react-markdown`. This is Vite's chunking algorithm hoisting `react-markdown`'s shared dependency
  tree into the first common boundary now that three separate lazy chunks (`StoryRightPanel`,
  `TaskDetailModal`, `MilestoneDetailPage`) all import `CommentsSection` — not a duplication problem,
  and the app's *initial* chunk (`index-*.js`, 63.89 kB gzip) stays well under the 500 kB budget, so no
  convention is violated. Noted here only because the single-file size is a first for this project.
