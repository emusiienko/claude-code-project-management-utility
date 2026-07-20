---
status: Done
assignee: frontend-developer
story: STORY-008
---

# TASK-008: @role mention combobox and render highlighting

## What to implement
Add `@role` mention support to comment content — an accessible autocomplete on input plus mention
highlighting on render. This is the app's first non-native dropdown.

- **Autocomplete combobox.** While typing in the Add-Comment content field or editing an existing
  comment's content, typing `@` opens an inline autocomplete listing the project's effective
  `participant_roles`, filtered live as typing continues after `@`. Selecting an entry inserts
  `@<role-value>` as literal text at the cursor and closes the combobox; the user may instead
  dismiss it and keep typing free text. When no effective role matches the typed text, the combobox
  shows an empty state (not an error). The combobox only ever inserts text — no notification, link,
  or other side effect.
- **Accessibility (hard requirement).** Build to the ARIA combobox/listbox pattern and WCAG 2.1 AA:
  fully keyboard operable (arrow keys to move through matches, Enter to select the highlighted
  match, Escape to dismiss without inserting and return focus to the textarea at the same cursor
  position); focus is never trapped outside the textarea.
- **Render highlighting.** When comment content is rendered on any of the three hosts, a `@<value>`
  token that exactly matches a role currently in the project's effective `participant_roles` is
  shown as an accent-colored inline badge inside the rendered Markdown; a token matching no current
  role renders as plain text. This applies to comment content only.

## Scope
The mention combobox integrated into the comment content input (add + edit) and the render-time
mention highlighting in the comment thread. Comment story/task content fields elsewhere are
unaffected.

## Dependencies
TASK-007.

## Acceptance Criteria
- [x] Typing `@` opens a live-filtered combobox over the effective `participant_roles`; selecting
  inserts `@<value>` at the cursor; dismissing leaves free text intact.
- [x] No matches shows an empty combobox state, not an error.
- [x] The combobox is fully keyboard operable (arrows / Enter / Escape), follows the ARIA
  combobox/listbox pattern, meets WCAG 2.1 AA, and never traps focus outside the textarea.
- [x] On render, `@<value>` tokens matching a current effective role are highlighted as accent
  badges; non-matching tokens render as plain text.
- [x] Content is stored/returned exactly as typed; a mention whose role is later removed renders as
  plain text with no data change.

## Intended ADR
None.

---
## Implementation Report
<!-- filled by implementor -->
**Date**: 2026-07-20

**What was done**:
Built the `@role` mention autocomplete and render-time highlighting on top of TASK-007's
`CommentsSection`, scoped strictly to comment `content` fields (Add form + inline Edit form) and
comment thread rendering — no other content field in the app is affected.

- `frontend/src/features/comments/hooks/useMentionCombobox.ts` (new) — the ARIA combobox's state
  machine. Given the textarea's latest content + cursor position (reported via
  `handleSelectionChange`), it derives whether an `@role` mention is currently being typed (an `@`
  preceded by start-of-text or whitespace, with no whitespace yet typed after it), the live-filtered
  `matches` (case-insensitive `startsWith`) against the effective `participant_roles`, and keyboard
  navigation state (`activeIndex`, `ArrowUp`/`ArrowDown`/`Enter`/`Escape` handling). While open, it
  registers itself on the app's existing shared modal-escape stack (`useModalEscape`, from STORY-007
  BUG-004) so `Escape` closes the combobox before it can reach an enclosing modal (Task Detail Modal,
  Story slide-over) — no manual `stopPropagation` needed, since the stack always resolves to the
  most-recently-registered (topmost) entry, and the combobox registers after its host modal.
- `frontend/src/features/comments/components/MentionTextarea.tsx` (new) — a drop-in replacement for
  a plain `<textarea>` (same value/onChange/required/disabled/rows/maxLength/placeholder/
  aria-describedby/className contract, plus a `roles` prop) that wires the hook to the DOM: applies
  `role="combobox"`/`aria-expanded`/`aria-haspopup="listbox"`/`aria-controls`/`aria-activedescendant`/
  `aria-autocomplete="list"` to the textarea itself, and renders the listbox in a `createPortal` to
  `document.body`, positioned with `position: fixed` computed from the textarea's own
  `getBoundingClientRect()` (recomputed on open, and on window resize/scroll while open, the latter
  with `capture: true` so scrolling any nested scrollable ancestor — e.g. the Story slide-over's or
  Task Detail Modal's own scroll container — is also caught, since native `scroll` events don't
  bubble). The portal means the popup is never clipped by an `overflow` ancestor, which matters here
  since the Add-Comment form sits pinned at the very bottom of a scrolling panel. Selecting an option
  is wired through `onMouseDown` + `preventDefault` (not `onClick`) so the textarea never blurs before
  the selection completes — focus stays in the textarea throughout, satisfying "never traps focus
  outside the textarea" trivially, since focus is never moved to the popup in the first place.
  Selecting inserts `@<role> ` (a trailing space is added for authoring flow) and restores focus +
  cursor to just after the inserted text via `setSelectionRange` on the next frame.
- `frontend/src/features/comments/utils/mentionRehypePlugin.ts` (new) — `createMentionRehypePlugin`,
  a `react-markdown` `rehypePlugins` factory. Walks the rendered `hast` tree (skipping `code`/`pre`
  subtrees, so a literal `@role` shown as code stays plain text) and splits any text node's
  `@<word>` tokens that exactly match a role in the given `roles` list into their own
  `span.mention` element; non-matching tokens are left untouched. Operates purely on the render
  output — `content` itself is never read from or written to here, so a mention whose role is later
  removed from `participant_roles` simply stops being wrapped on the next render (the plugin is
  re-created with the live `participant_roles` on every render), with zero data change.
- `frontend/src/features/comments/components/MentionMarkdownSpan.tsx` (new) — the paired
  `components={{ span: ... }}` override: renders `MentionBadge` for a `span.mention`, and every other
  `span` unchanged (pass-through).
- `frontend/src/features/comments/components/MentionBadge.tsx` (new) — the accent-colored inline
  badge itself (`bg-brand-100`/`text-brand-700`, consistent with the existing reply-chip and
  active-combobox-option color treatment already in this feature).
- `frontend/src/features/comments/components/AddCommentForm.tsx`,
  `frontend/src/features/comments/components/EditCommentForm.tsx` — both swapped their plain
  `<textarea>` for `<MentionTextarea>`, and both now accept a `participantRoles: string[]` prop.
- `frontend/src/features/comments/components/CommentRow.tsx` — its `ReactMarkdown` call gained
  `rehypePlugins={[createMentionRehypePlugin(participantRoles)]}` and a `span` component override
  (coordinated with the concurrently-landing TASK-009, which added its own `a` override for
  permalink jump-links on the same `components` map — the two now share one `MARKDOWN_COMPONENTS`
  constant rather than each owning a separate inline object). Also threads `participantRoles` down
  into `EditCommentForm`.
- `frontend/src/features/comments/components/CommentsSection.tsx` — resolves
  `participantRoles = effectiveSettings?.participant_roles ?? []` from the already-fetched
  `useProjectSettingsEffective` query (the same query TASK-007 already used for
  `default_web_ui_role`) and passes it to `CommentRow` and `AddCommentForm`.

**Deviations from plan**: None from this task's file. One implementation detail beyond the letter of
the acceptance criteria: selecting a mention inserts `@<role> ` with a trailing space (not bare
`@<role>`), matching the conventional mention-picker UX (GitHub/Slack-style) so the author can keep
typing prose immediately — the criterion ("inserts `@<role-value>` as literal text at the cursor") is
still satisfied since the value itself is inserted verbatim.

**Technical decisions made**:
- **The combobox is layered on the shared modal-escape stack rather than manual
  `stopPropagation`.** `useModalEscape` (STORY-007 BUG-004) already exists specifically to resolve
  stacked-host Escape conflicts by topmost-registration-order; since `useModalEscape`'s underlying
  `keydown` listener is `capture: true` on `document`, it always runs before a plain React
  `onKeyDown` on the textarea would, so `stopPropagation` from the textarea's own handler could not
  have preempted an enclosing modal's Escape handler anyway — registering the combobox as its own
  topmost stack entry while open is the only mechanism that reliably wins.
- **Popup rendered via `createPortal` with `position: fixed`, not absolutely positioned inline.**
  The Add-Comment form is pinned at the bottom of a scrolling Comments section; an inline
  `absolute`-positioned popup anchored to the textarea would be clipped by the panel's own
  `overflow-y` (or the Task Detail Modal's/Story slide-over's outer scroll container). A portal to
  `document.body`, repositioned from the textarea's live bounding rect, sidesteps this without
  touching any host layout.
- **Mention highlighting operates on the rendered `hast` tree via a rehype plugin, not on raw
  `content` text or a `p`/`li` component override.** This keeps normal Markdown parsing
  (links, emphasis, code, etc.) completely intact around a mention, and confines the "does this
  token match a current role" check to text nodes only — it correctly leaves `@role`-shaped text
  inside code spans/blocks untouched (added a `code`/`pre` skip after noticing the first version
  would have also badged mentions shown as code).
- **A single `span.mention` marker class, not a custom hast node type or `data-*` property.** Reusing
  `react-markdown`'s existing `components.span` override point (already used by nothing else in this
  app) avoids introducing a custom AST node type — which would require a matching custom hast→React
  tag mapping — for a one-off need.
- **Combobox matching is case-insensitive `startsWith`, not substring/fuzzy.** Matches the mental
  model of "typing a role name from its start" and keeps the filter cheap and predictable; no story
  requirement calls for fuzzy matching.

**Code locations**:
- `frontend/src/features/comments/hooks/useMentionCombobox.ts` (new)
- `frontend/src/features/comments/components/MentionTextarea.tsx` (new)
- `frontend/src/features/comments/components/MentionBadge.tsx` (new)
- `frontend/src/features/comments/components/MentionMarkdownSpan.tsx` (new)
- `frontend/src/features/comments/utils/mentionRehypePlugin.ts` (new)
- `frontend/src/features/comments/components/AddCommentForm.tsx` (adds `participantRoles`; textarea → `MentionTextarea`)
- `frontend/src/features/comments/components/EditCommentForm.tsx` (adds `participantRoles`; textarea → `MentionTextarea`)
- `frontend/src/features/comments/components/CommentRow.tsx` (adds `participantRoles`; `ReactMarkdown` gets the mention rehype plugin + `span` override, shared with TASK-009's `a` override via one `MARKDOWN_COMPONENTS` constant)
- `frontend/src/features/comments/components/CommentsSection.tsx` (resolves and threads `participantRoles`)

**Technical debt noted**:
- Baseline Vitest suite (before this task): 201 passed across 20 files. Post-implementation: 201
  passed across 20 files — no regressions. `tsc --noEmit` was clean for the full tree at the point
  this task's changes were complete; TASK-009 was landing concurrently in several of the same files
  (`CommentRow.tsx`, `CommentsSection.tsx`) plus its own new files during this session, and a couple
  of transient `tsc` errors appeared in its in-progress `CommentsPage.tsx`/`router.tsx` while it was
  still mid-edit — those are outside this task's scope (permalink resolver, not mentions) and not
  introduced by anything in this report; `git status` confirms none of the affected files are in this
  task's file list above.
- No dedicated automated test coverage was added for the combobox or highlighting (this role does
  not write tests; qa-automation owns that per the pipeline). The components are structured to be
  testable without reading internals: `MentionTextarea` takes `value`/`onChange`/`roles` as plain
  props with no hidden context reads, and `createMentionRehypePlugin`/`MentionMarkdownSpan` are pure
  functions of their inputs.
- `docs/frontend-coding-conventions.md` re-read before completion — no gaps found; no convention
  change made (per policy, conventions are only updated at the user's explicit request).
