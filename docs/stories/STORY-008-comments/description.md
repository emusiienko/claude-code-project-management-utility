---
status: Accepted
type: feature
priority: P1
date: 2026-06-28
---

# STORY-008: Work Item Comments

## Desired Outcome
Free-form text notes can be attached to stories, tasks, or milestones to record observations, decisions, and contextual information inline with the work item. Every comment records who wrote it — a required author role — and supports free-form labels for semantic tagging. When a comment is added from the Web UI, the author role is pre-filled from a configurable default so the human orchestrator isn't forced to type it every time, while still being free to change it. While composing a comment, the author can mention another project role with `@role` — a lightweight, non-actionable convention that helps other agents reading the comment later notice who it's addressed to. Every comment can also be linked to directly, and can be replied to — a reply is an ordinary new comment that carries a reference back to the comment it responds to, so both a human clicking through a browser and an agent reading the thread over MCP can find the original message.

## Context
Comments are the lightweight prose annotation layer. Unlike attachments (which store files or external references), comments store text only and are always immediately visible alongside the work item. Labels allow callers to tag comments with meaning (e.g. "decision", "requires-action", "blocker") without the utility interpreting or acting on those tags.

Comments attach to all three work item types — stories, tasks, and milestones — on equal footing with the Attachments feature. This closes the gap left open when milestone attachments shipped: the milestone detail view has returned an always-empty `comments` list pending this story. `requirements.md` currently scopes comments to stories and tasks only, and describes `author_role` as optional; it will be updated at reconcile to add milestones as a third container and to make `author_role` required.

**Author role is now mandatory** on every comment, for every caller (Web UI, REST, MCP) — a comment can no longer be created without one. To keep this convenient for the human orchestrator, a new setting — the **default Web UI role** — supplies a starting value that the Add Comment form pre-fills automatically; the orchestrator can still change it before submitting. This setting is deliberately named and scoped generically, not as a comments-only concept: it represents "the role to assume by default for anything authored through the Web UI", so a future story can reuse the same setting for another entity's author/creator-style field (e.g. a Task's `creator_role`) without introducing a second setting. This story is the first and, for now, only consumer — it wires the setting into the Comment's `author_role` alone. The setting follows the same system-default + optional per-project-override resolution already used by the five existing dictionaries. Its value must itself be one of the project's effective `participant_roles` entries. Out of the box the system default is `"operator"` — a new entry added to the `participant_roles` seed list to represent the human orchestrator using the Web UI (every existing entry in that list denotes an AI agent role). As before, a comment's own `author_role` value is never validated against `participant_roles` once set — only the *default setting's* value is constrained to come from that dictionary.

**`@role` mentions** are a Web UI authoring convenience scoped to Comment content only. They call no action, send no notification, and link to nothing — they exist purely so a human writing a comment can address it to a specific project role by name, and so that convention is visible to any agent (or person) reading the comment's plain text content later. The mention is nothing more than literal text inside `content`; the utility does not parse, store, or validate it as a separate field.

**Comment permalinks** are schema-free: every comment already has a stable `id` and belongs to exactly one story, task, or milestone, and that alone is enough to construct a direct link to it — no new field is needed to make a comment addressable.

**Replies** carry their lineage as a persisted, immutable **ancestor path** (`ancestors`) rather than as text baked into `content` — a deliberate architect decision (see ADR-023) that keeps the reply relationship as structured data both a human and an agent can read directly, rather than requiring either to parse a link out of prose. **Reply**, from the Web UI, marks the comment being replied to as the target for the comment being composed (shown as a dismissible "↩ Replying to {author_role}'s comment" chip above the Add Comment form) and, on submit, the server derives and stores the new comment's ordered ancestor id list from the target's own lineage plus the target itself. `content` is never pre-seeded with link text — the author's words are the only thing in it. In the rendered thread, a reply shows a lightweight "↩ Replying to {author_role}" line above its content, derived from its stored lineage, which a human can click to jump to the original message; an agent reading a comment's `ancestors` (or calling the dedicated ancestor-lookup endpoint/MCP tool) gets the same relationship as structured data — no link-parsing required.

Replying isn't only a Web UI affordance, though — an agent creating a comment via REST or MCP has no "click Reply" button and shouldn't need to hand-construct a browser URL itself (that's a Web UI routing concern it has no business knowing about). So comment creation accepts one additional, optional, **request-only** input — `in_reply_to` (another comment's `id`) — that is never stored as its own field and never appears in a comment's response body. When present, the server validates that the referenced comment exists and belongs to the very same story, task, or milestone as the comment being created, then derives and persists the new comment's `ancestors` from it. The reply *relationship* is persisted (as `ancestors`) and *is* returned in every response; only the request-only `in_reply_to` field itself is not stored. This gives agents full reply parity with the Web UI by setting one field, with no link construction and no knowledge of the Web UI's URL scheme.

## Acceptance Criteria
- [ ] A comment can be created on a story, task, or milestone with required Markdown content (1–50,000 chars), a required `author_role`, and optional free-form labels (key-value pairs)
- [ ] `author_role` is required on every create call regardless of caller — Web UI, REST, or MCP. The server never substitutes a default for a missing or empty `author_role` — the request is rejected for **every** caller, with no exception for the Web UI. The Web UI is therefore itself obliged to always send a non-empty value: it sources one from the default Web UI role setting to pre-fill the field, but it is the Web UI's responsibility to ensure a value is present before submitting, exactly like any other required field
- [ ] `author_role` is set once at creation and is immutable thereafter — consistent with the same field on Attachments; only `content` and `labels` can be changed later
- [ ] Comments on a story, task, or milestone can be listed in chronological order (newest first) with pagination; results can be filtered by label key and label value
- [ ] A comment's content and labels can be updated independently — updating only content leaves existing labels unchanged, and updating only labels leaves existing content unchanged; updating labels replaces the entire labels array
- [ ] A comment can be deleted
- [ ] A single comment can be fetched on its own (outside the context of a list)
- [ ] Labels on comments are fully free-form — no dictionary validation applies to any label key or value, and a comment's `author_role` is never validated against the participant_roles dictionary
- [ ] Comments on a story, task, or milestone appear in that work item's detail view, ordered newest first — closing the previously-empty `comments` list on all three detail views
- [ ] Web UI role, deliberately general-purpose rather than comments-specific — determines the value the Web UI pre-fills when starting a new comment; it resolves the same way as the five existing dictionary keys (project-level override completely replaces the system default when set; otherwise the system default applies)
- [ ] The default Web UI role's value must be one of the project's current effective `participant_roles` entries
- [ ] The `participant_roles` dictionary's system-seeded defaults gain a new entry, `"operator"`, representing the human orchestrator (as opposed to an AI agent role); the default Web UI role's system default is `"operator"`
- [ ] Because `"operator"` becomes an ordinary entry in `participant_roles`, it is selectable anywhere that dictionary is already used — e.g. as a Task's `assignee_role` or `creator_role` — not only as the default Web UI role; this is an intentional side effect, not a restriction to work around
- [ ] While composing or editing a comment's content in the Web UI, typing `@` opens an autocomplete combobox listing the project's effective `participant_roles` values, filtered live as typing continues; selecting an entry inserts `@<role-value>` as literal text into `content`
- [ ] `@role` mentions are purely textual — they never trigger a notification, a link, or any other side effect, and the API never treats them as a distinct field; a comment's `content` is stored and returned exactly as typed, mention or not
- [ ] Every comment has a direct, shareable link; opening it in a browser navigates straight to that comment's host work item (story, task, or milestone) with that specific comment scrolled into view and visually highlighted
- [ ] Every comment has a **Reply** action that marks it as the target for the comment being composed (shown as a dismissible "↩ Replying to {author_role}'s comment" chip above the Add Comment form); submitting posts an ordinary new comment carrying the target's lineage — no visual nesting, indentation, or thread structure is created
- [ ] A reply renders a "↩ Replying to {author_role}" line derived from its stored lineage; clicking it navigates to the original comment, exactly like the standalone permalink behavior above
- [ ] Creating a comment via REST or MCP accepts an optional `in_reply_to` input identifying another comment; when present, the server validates it and derives the new comment's ordered ancestor lineage from it — giving agents reply parity with the Web UI by setting one field, without needing to construct a link themselves
- [ ] `in_reply_to` is a request-only input — it is never persisted as its own field and is not itself returned in a comment's response body. The reply *relationship* it establishes, however, **is** persisted (as an ordered ancestor-id list) and **is** returned on every comment — an agent or the Web UI can read a comment's stored lineage directly, with no link-parsing required. `content` is stored and returned exactly as the author typed it, with no server-added text
- [ ] Every comment operation — create, list, get by id, update, delete — is available through both REST and MCP, mirroring each other exactly, so an agent can retrieve a specific comment (including one referenced by a reply link) the same way the Web UI does

## Edge Cases & Error Scenarios
- [ ] Creating a comment with empty content is rejected: "Comment content is required."
- [ ] Creating a comment with content over 50,000 chars is rejected
- [ ] Creating a comment without an `author_role`, or with an empty one, is rejected: "Comment author is required."
- [ ] Creating a comment on a story, task, or milestone that does not exist is rejected: "not found"
- [ ] Updating or deleting a comment that does not exist is rejected: "not found"
- [ ] Attempting to change `author_role` via update has no effect — it is silently ignored, consistent with how other immutable fields (e.g. an attachment's `author_role`) behave elsewhere in the utility
- [ ] Updating a comment with an empty labels array removes all its labels — this is valid
- [ ] Deleting a story, task, or milestone removes all its comments — no orphaned comment records remain
- [ ] Filtering comments by a label key that no comment has returns an empty list, not an error
- [ ] Setting the default Web UI role to a value that is not currently in the effective `participant_roles` list is rejected: "Value '{v}' is not allowed. Allowed: {list}."
- [ ] Clearing a project's override for the default Web UI role reverts it to the system default, the same as clearing any other project-level dictionary override
- [ ] Typing `@` when the project's effective `participant_roles` list has no matches for the text typed so far shows an empty combobox state, not an error
- [ ] Ignoring the combobox and continuing to type free text after `@` is allowed — whatever the user typed is saved verbatim as part of `content`
- [ ] A stored `@role` mention whose role was later removed from `participant_roles` is unaffected — the comment's `content` never changes on its own; on next render, that mention is simply no longer recognized and displays as plain text
- [ ] Comments have no archive or tombstone — deletion is permanent, so a standalone permalink to a since-deleted comment cannot resolve to a host work item (there is no surviving container information to resolve from). Opening such a link shows a calm, non-error "no longer available" message with a way back home, rather than crashing or looking like a broken page. A reply's "↩ Replying to {author_role}" line pointing at a since-deleted comment, rendered *within an already-loaded thread* (where the host work item is already known), simply degrades to plain, unlinked text instead
- [ ] Replying shows a dismissible "↩ Replying to {author_role}'s comment" chip above the Add Comment form; the author can dismiss it before submitting to post an ordinary, unrelated comment instead. `content` itself is never pre-seeded with any text from the reply target
- [ ] Nothing prevents multiple independent replies to the same comment, or a reply to a reply — since a reply is just an ordinary comment, the thread stays a flat, newest-first list; there is no nested/threaded display
- [ ] Creating a comment with an `in_reply_to` value that does not exist is rejected: "not found"
- [ ] Creating a comment with an `in_reply_to` value that exists but belongs to a different story, task, or milestone than the one being commented on is rejected: "A reply must be on the same story, task, or milestone as the comment it replies to."

## UI/UX

**Comments section (Story slide-over right panel, Task Detail modal, and Milestone Detail page — identical behavior on all three hosts):**
- Section heading "Comments" with a live count badge, matching the Attachments section convention
- Thread rendered newest-first: each entry shows the author role, the comment content rendered as Markdown, its label chips, a timestamp, and — for a reply — a "↩ Replying to {author_role}" line above the content
- Each comment has inline **Edit**, **Reply**, **Delete**, and **Copy link** icon actions (Lucide, per the icon library standard); **Delete** uses the standard destructive-action confirmation dialog and a visually distinct danger color
- **Edit** switches that comment's entry into an inline form for `content` and `labels` only — `author_role` is displayed as read-only text in edit mode, since it cannot be changed
- **Add Comment** form is pinned at the top of the section, above the thread:
  - `author_role` text input, pre-filled with the project's effective default Web UI role (resolved the same way effective dictionary values are shown elsewhere); the user can freely edit or clear this value before submitting — it is a plain free-form text field, not a dropdown, consistent with the rule that a comment's own author role is never dictionary-validated
  - `content` Markdown textarea, required
  - Labels editor (reuses the existing key/value labels editor pattern)
  - Submit is disabled while `content` or `author_role` is empty; inline errors appear below each field on a failed attempt
  - On success, the new comment appears at the top of the thread and the form resets — `content` and `labels` clear, `author_role` resets to the effective default Web UI role again (not to whatever the user last typed)
- The Milestone Detail page's Comments section is new: it is added directly below the existing Attachments section, replacing the current "Deferred to STORY-008" placeholder note

**`@role` mentions in comment content:**
- While typing in the `content` field of the Add Comment form, or while editing an existing comment's content, typing `@` opens an inline autocomplete combobox listing the project's effective `participant_roles` values; the list narrows live as the user keeps typing after `@`
- Selecting an entry from the combobox inserts `@<role-value>` at the cursor position; the combobox then closes. The user may also dismiss it and keep typing free text — nothing is enforced
- The combobox never performs any action beyond inserting text — no notification is sent, nothing is linked, no other part of the utility is aware a mention exists
- When a comment's content is rendered (in the thread, on any of the three hosts), any `@<value>` token that exactly matches a role currently in the project's effective `participant_roles` list is shown with a distinct highlight (an accent-colored inline badge) inside the rendered Markdown; a token that does not match any current role renders as plain text, identical to the rest of the content
- This applies only to Comment content — Story and Task content fields are unaffected by this story
- **Accessibility:** this is the app's first non-native dropdown (every other picker in the app is a native `<select>`, keyboard-accessible by default) and must be built to the same WCAG 2.1 AA bar explicitly: it follows the ARIA combobox/listbox pattern, is fully operable from the keyboard (arrow keys to move through matches, `Enter` to select the highlighted match, `Escape` to dismiss the combobox without inserting anything and return focus to the textarea at the same cursor position), and never traps focus outside the textarea

**Comment permalinks:**
- **Copy link** on any comment copies a direct URL to the clipboard, and shows a brief confirmation (e.g. a toast reading "Link copied"), consistent with the app's existing toast notification pattern
- Opening that URL (in the same browser or a different one) opens the app directly at that comment's host view — the Story slide-over, Task Detail modal, or Milestone Detail page, whichever owns it — with the comments section already expanded and that specific comment scrolled into view and briefly highlighted (e.g. a momentary accent background that fades)
- Because comments have no archive or tombstone, a permalink to a comment that has since been hard-deleted has no surviving host to resolve to; opening it instead shows a calm, non-error status message (e.g. "This comment is no longer available.") with a link back home
- The same host-resolution mechanism underlies the reply-prefix line (below) when it is clicked from within a rendered comment

**Replying to a comment:**
- **Reply** on any comment marks it as the target and opens (or scrolls into view) the Add Comment form, showing a dismissible "↩ Replying to {author_role}'s comment" chip above the `content` field; `content` itself is left empty for the author's own words
- The author can dismiss the chip before submitting to drop the reply relationship and post an ordinary, unrelated comment instead
- `author_role` still pre-fills from the effective default Web UI role exactly as it does for any new comment; labels behave identically too
- Submitting posts an ordinary new comment at the top of the (flat, newest-first) thread, carrying its lineage back to the target — there is no visual nesting, indentation, or thread structure beyond the "↩ Replying to {author_role}" line the rendered comment itself shows
- In the rendered thread, that line is clickable and, when clicked, resolves via the comment-permalink mechanism above; if its target has since been hard-deleted, the line simply renders as plain, unlinked text (the host work item is already known from the surrounding thread, so no "no longer available" fallback is needed here)

**Settings — default Web UI role:**
- Both the System Settings view and the Project Settings view gain a new row alongside the five existing dictionary rows, e.g. "Default Web UI role" — named and described generically (not "comment author"), since this story is only its first consumer and a later story may point another field at the same setting
- Unlike the other five keys (chip-list or `LinkTypesEditor`), this row renders as a single-value dropdown populated from the effective `participant_roles` list — because it holds exactly one value, not a set
- System Settings: the dropdown is pre-selected to the current system value (`"operator"` out of the box); Save updates the system-wide default
- Project Settings: shows the current project override (if set) with an `Override` badge, or the inherited system value otherwise; the same **Override/Edit** and **Clear override** controls as the other five keys apply here (inheriting the same known backend gap — see `requirements_backend.md` § Known Gaps — until that gap is closed)
- Selecting a value not currently present in the effective `participant_roles` list is prevented client-side (the dropdown only ever offers current, valid values) and rejected server-side if attempted another way
- For now, this row's only observable effect anywhere in the product is pre-filling the Add Comment form's `author_role` field
