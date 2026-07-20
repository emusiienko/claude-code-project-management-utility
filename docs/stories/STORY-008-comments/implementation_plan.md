# Implementation Plan: STORY-008 — Work Item Comments

## Context

Comments are the lightweight prose-annotation layer of the utility. They attach to all three
work item types — stories, tasks, and milestones — on equal footing with Attachments, and they
store Markdown text only (no files, no external references). This story closes the gap left open
since STORY-007/012: the milestone, story, and task detail views have been returning an
always-empty `comments` list pending this feature.

The feature reuses the polymorphic-container pattern already proven by Attachments, so the bulk of
the backend is mechanical and low-risk. Three areas carry the genuinely new design work:

1. A new **`default_web_ui_role`** setting — a *single-value* setting living in the existing
   settings store (which until now held only list-valued dictionaries). It supplies the value the
   Web UI pre-fills into a comment's `author_role`. It is deliberately general-purpose so a later
   story can point another entity's author/creator field at the same setting.
2. **`@role` mentions** — the app's first non-native dropdown, an accessible autocomplete combobox
   over the project's effective `participant_roles`. Mentions are pure text with no schema impact.
3. **Comment permalinks & replies** — every comment is addressable by its own `id` (schema-free
   permalinks). A **reply** is an ordinary flat comment that carries a **materialized ancestor path**
   (`ancestors`): the ordered list of ancestor comment ids from the root down to its direct parent.
   The lineage is therefore self-contained on the entity — one read yields the whole reply chain.

> **Design decision — replies use a persisted materialized ancestor path, not text baked into
> content.** The description prescribes a schema-free mechanism (a request-only `in_reply_to` the
> server turns into a Markdown link prepended to `content`, never stored). That is an implementation
> prescription; the architect owns the implementation approach. This plan instead persists an
> immutable `ancestors` id-list and keeps `content` purely the author's words. Rationale: the reply
> lineage is self-contained on each comment (an agent arriving at one comment knows its full
> ancestry without walking pointers or fetching the container), sub-thread queries fall out of the
> existing JSON-array filter, `content` stays clean and editable, and every reader (Web UI and MCP
> agent alike) gets the relationship as structured data. This diverges from several current
> `description.md` acceptance criteria — see **Spec Divergences** below.

The system is confirmed **pre-production** (no deployed DB): the settings seed migration is edited
in place and the whole chain is re-run as a clean install, rather than adding a data migration to
backfill `operator`.

## Revision — Comment ordering is newest-first (2026-07-19)

> This section supersedes the ordering direction described throughout the rest of this plan.
> Everything below in **Technical Approach** and the original **Ordered Tasks** documents what
> shipped first (oldest-first); the change here is delivered as follow-up tasks TASK-012 / TASK-013 /
> TASK-014 rather than by rewriting the already-`Done` tasks.

**What changed and why.** Comments now list **newest-first everywhere** — repository/API, pagination,
detail composition, and the Web UI. The original build listed them oldest-first (newest at the
bottom). The product owner wants the newest comment to appear first. Because comment lists are
paginated, a UI-only reversal is wrong: page 1 would fetch the *oldest* 50 and reverse only those,
never showing the newest until the last page. The ordering therefore flips at the source — the
repository — so pagination itself walks newest → oldest.

**Scope of the change (small and well-contained):**

- **Backend ordering** lives in exactly two places in the comments repository: the paginated
  container list and the enumerate-all helper that also feeds detail composition. Both flip their
  sort from ascending to descending on the same `(created_at, id)` key. Because story / task /
  milestone detail views compose their `comments` list through that same enumerate-all helper,
  **detail composition flips to newest-first automatically** — no service-layer change is needed.
- **The `after_id` incremental-polling watermark is preserved unchanged** — same name, same
  semantics. `after_id` means "comments created strictly **after** (newer than) the referenced
  one," expressed as the keyset predicate `(created_at, id) > (ref.created_at, ref.id)`. That
  predicate is orthogonal to display order and does **not** change. Only the surrounding `ORDER BY`
  flips to descending, so a watermark query now returns the newer-than-ref set newest-first. The
  sole observable difference for a polling agent: the newest comment it has seen is now the **first**
  item in the list rather than the last, so it reads its next watermark from the top. The
  deleted-watermark → 404 behavior is unchanged. **Decision (user-confirmed): keep the `after_id`
  name and semantics.**
- **Frontend** renders the server order as-is, so the thread becomes newest-first once the API
  flips; a newly-created comment lands at the **top** after refetch. The pinned **Add-Comment form
  moves to the top** of the section (above the thread), so the author writes at the top and their
  new comment appears directly beneath — consistent with newest-first. **Decision
  (user-confirmed): form at top.** The reply-prefix jump link, permalink resolution, `@role`
  combobox, count badge, edit/delete/copy-link actions, and label filtering are all
  order-independent and unaffected.
- **Ancestor lineage is NOT reordered.** `GET /comments/{id}/ancestors` still returns ancestors
  root-first (oldest ancestor → direct parent): that is a lineage path, not a chronological list.
  The newest-first change applies only to *container comment lists* and *detail composition*.
- **`descendant_of` sub-thread lists** ride the same list endpoint and therefore also return
  newest-first — correct and consistent.

**Spec follow-up.** Several `description.md` acceptance criteria still say "oldest first" and
"appears at the bottom." Those are now stale and are flagged for the spec-writer to update (see
**Spec Divergences** below) — the architect does not edit `description.md`.

## Technical Approach

### Comments domain (backend)

A new `comments` domain package following the established per-domain layout (model, repository,
service, schema, controller, MCP tools), structurally mirroring `attachments`:

- **Container model** — polymorphic and FK-less: a `container_type` discriminator (story / task /
  milestone) plus a `container_id`, exactly as Attachments store their container reference. The
  entity carries `content` (Markdown, 1–50,000 chars), a required-and-immutable `author_role`,
  free-form `labels` (key/value pairs), an immutable `ancestors` materialized path, and
  creation/update timestamps. Ids are UUIDs, consistent with every other entity in the app. A
  composite index over `(container_type, container_id, created_at)` backs chronological listing.
- **The `ancestors` materialized path** is an ordered list (root-first) of ancestor comment ids,
  stored as a JSON array. A top-level comment has an empty list; a reply's list is computed once at
  creation as `parent.ancestors + [parent.id]` and is thereafter immutable. The direct parent is
  simply the last element — no separate parent field is stored. Ancestor ids are held FK-less
  (consistent with the polymorphic-container convention and side-stepping the known SQLite FK-inert
  gotcha); referential integrity is not DB-enforced, so a deleted ancestor's id lingers harmlessly
  in descendants' lists and readers degrade gracefully — the same benign "target gone" behavior the
  permalink mechanism already accepts.
- **Repository** — container-scoped `list_paginated` returning oldest-first, supporting: label-key
  and label-value filters and an *ancestors-contains* filter (the whole sub-thread under a given
  comment) via the shared dialect-aware JSON-array helper already used by tasks and attachments; and
  an `after_id` watermark applied as a keyset predicate on `(created_at, id)` for incremental
  retrieval. Plus single fetch / insert / update / delete; a `list_by_ids` helper (ordered fetch of
  a set of comment ids, powering ancestor traversal in a single `id IN (…)` query — no recursion);
  and a cascade pair (`list_all_for_container` + `delete_all_for_container`) mirroring the
  attachments cascade contract. String→UUID coercion stays in the shared base repository.
- **Service** — the single home for all business rules:
  - **Create** across all three containers with validation precedence:
    container-exists (404) → content non-empty and within length (422) →
    `author_role` non-empty (422) → when `in_reply_to` is supplied: referenced comment exists
    (404) → referenced comment shares the same container (422). On a valid reply the service
    computes and persists `ancestors` from the parent; `content` is stored exactly as submitted.
  - **Update** changes `content` and `labels` independently; an empty labels array clears all
    labels; attempts to change `author_role` or `ancestors` are silently ignored (both immutable,
    consistent with Attachments' `author_role`).
  - **List / get-by-id / delete** round out the surface.
  - **Ancestor traversal** — a `get_ancestors` method returns the ordered (root-first) ancestor
    comment bodies for a comment, resolving its `ancestors` id list through `list_by_ids` in one
    query. This is the "up" direction, symmetric with the "down" direction already served by the
    repository's ancestors-contains sub-thread filter.
  - Cross-domain container existence is read through reader Protocols (story / task / milestone),
    satisfied structurally by the concrete repositories — the same technique Attachments use.
  - A `CommentReader` Protocol is declared here (the reverse direction) so story, task, and
    milestone services can compose comments into their detail views and cascade-delete them.
- **Controller + MCP tools** — a JSON-only REST surface (no content negotiation; comments carry no
  binary) and a behavior-identical set of MCP tools, giving full REST/MCP parity across create,
  list, get-by-id, update, delete. Container-scoped create/list routes hang off each of the three
  hosts; get/update/delete are top-level by comment id (`/comments/:id`). DI providers register on
  the shared container; the comments package is added to the MCP auto-wiring list.
- **Create input vs. persisted shape.** The create call takes a single optional `in_reply_to` (one
  comment id) — write ergonomics stay simple. The persisted-and-returned representation is the
  `ancestors` list; the direct parent is `ancestors[-1]`. The response also exposes the comment's
  own `container_type` + `container_id` (needed by the permalink resolver and by an agent locating
  the thread).

### Replies & permalinks (the shared contract)

- **Permalinks** are schema-free: every comment is addressable by `"/comments/{commentId}"`, a
  root-relative path that keeps the backend origin-agnostic. The Web UI owns a resolver route at
  `/comments/:id` that fetches the comment, reads its container, navigates to the owning host view
  (story slide-over / task detail modal / milestone detail page) with the comments section
  expanded, and scrolls the comment into view with a brief highlight. An agent reads a permalink's
  id and calls get-by-id. A permalink whose target was deleted still resolves to the host view;
  there is simply nothing to scroll to.
- **Replies** ride on the persisted `ancestors` path:
  - *Web UI:* the Reply action sets the target on the comment being composed and shows a dismissible
    "↩ Replying to {author_role}'s comment" chip above the compose form; the author can dismiss it
    before submitting. `content` is never pre-seeded with link text. `author_role` and labels behave
    exactly as for any new comment.
  - *REST / MCP:* the create call accepts the same optional `in_reply_to` id, validated identically.
    Agents get full reply parity by setting one field — no link construction, no knowledge of the
    Web UI's URL scheme.
  - *Rendering (all three hosts):* a comment whose `ancestors` is non-empty renders a lightweight
    prefix line ("↩ Replying to {author_role}") derived from its direct parent (`ancestors[-1]`,
    looked up within the already-loaded thread), acting as a jump link that resolves through the
    same permalink scroll-and-highlight mechanism. The thread stays flat and oldest-first — the
    prefix is a header on an ordinary comment, with no nesting or indentation.
  - *Lineage retrieval:* traversal is first-class in both directions — **up** via the ancestor
    endpoint (ordered ancestor bodies for a comment) and **down** via the ancestors-contains
    sub-thread filter on the list endpoint. A caller can also read a comment's `ancestors` id list
    and join locally against the (small) container `list`. One capability stays a deliberately
    deferred, forward-compatible, non-breaking future extension (not v1): an anchored chronological
    window on the list endpoint ("N comments around comment X", computed on `created_at` via keyset
    paging — UUID ids do not constrain this); at the ~50-comment scale it is covered today by
    fetching the thread and slicing locally.

### Detail composition & cascade (backend)

Story, task, and milestone services gain a `CommentReader` dependency (alongside the existing
`AttachmentReader`). Each `get_detail` populates its `comments` list oldest-first, and each `delete`
cascades comment removal for its container. This closes the previously-empty `comments` field on all
three detail views.

### `default_web_ui_role` setting (backend)

The setting lives in the existing settings store, reusing the same `(key, values)` row mechanism,
the same system-default + project-override resolution, and the same clear-override path (which
inherits the known REST/MCP clear-override gap, unchanged by this story). It differs from the five
dictionaries in exactly two ways, both handled at the schema/service boundary:

- **Single value, not a list** — stored uniformly in the existing JSON `values` column and exposed
  as a scalar string on the settings request/response surface. It appears in the effective-settings
  payload alongside the five dictionaries.
- **Constrained value** — on write it must be non-empty and a member of the effective
  `participant_roles` for that scope (system participant_roles for a system write; the project's
  effective participant_roles for a project override). Its value is otherwise never re-validated,
  and it never constrains a comment's own free-form `author_role`.

The comment backend does **not** read this setting — `author_role` is always supplied by the caller.
The setting is consumed only by the Web UI (form pre-fill) via the effective-settings endpoint.

### Seed change (backend, clean install)

The settings seed migration is edited in place to add `"operator"` to the system
`participant_roles` default and to seed the system `default_web_ui_role` row as `"operator"`,
bundling the seed with its schema revision per house convention. `"operator"` represents the human
orchestrator driving the Web UI (distinct from the existing `orchestrator` agent-coordination
role); as an ordinary dictionary entry it is thereafter selectable anywhere `participant_roles` is
used. The chain is re-run as a clean install.

### Frontend

- **API client + hooks** for the five comment operations (create carrying optional `in_reply_to`),
  plus cache-key registration and the container's list + parent rich-detail invalidation on
  mutation, matching the attachments hook pattern.
- **`CommentsSection`** — a reusable section parameterized by container type / id / project,
  mounted identically in the story right panel, the task detail modal, and the milestone detail page
  (replacing that page's placeholder note). It renders the thread oldest-first (author role,
  Markdown content, label chips, timestamp, and a reply-prefix line derived from `ancestors[-1]`
  when the comment is a reply), a live count badge, per-comment inline actions
  (Edit / Reply / Delete / Copy link), and a pinned Add-Comment form. Edit switches a row to an
  inline content+labels form with `author_role` shown read-only. The form pre-fills `author_role`
  from the effective `default_web_ui_role`, disables submit while content or author_role is empty,
  and on success resets content/labels and re-applies the effective default. Reply sets the reply
  target via a dismissible chip; Copy link copies the absolute permalink and shows the standard
  toast.
- **`@role` mention combobox** — the app's first non-native dropdown, built to the ARIA
  combobox/listbox pattern and WCAG 2.1 AA: opens on `@` inside the content field, lists effective
  `participant_roles` filtered live, inserts `@<value>` on selection, is fully keyboard operable
  (arrows / Enter / Escape) and never traps focus. At render time, a `@<value>` token matching a
  current effective role is highlighted as an accent badge; any other token renders as plain text.
  Scoped to comment content only.
- **Permalink deep-linking** — the `/comments/:id` resolver route (host resolution + scroll-into-view
  + fading highlight), shared by both standalone permalinks and the reply-prefix jump link.
- **Settings UI** — a new "Default Web UI role" row in both the System and Project settings views,
  rendered as a single-value dropdown populated from the effective `participant_roles` (distinct
  from the chip-list / link-types editors), with the same Override / Clear-override controls as the
  other keys.

## Spec Divergences

Model-B replies (a persisted materialized ancestor path) override implementation-prescriptive
language in the current `description.md`. The *behavioral* intent is preserved (a reply is an
ordinary flat comment referencing the original; flat oldest-first thread with no visual nesting;
agents have reply parity; permalinks navigate + scroll + highlight; a reference to a deleted comment
degrades gracefully). The following criteria describe the *mechanism* and now diverge — recommend
the spec-writer strip the implementation prescription (keeping the behavior) before or at reconcile:

- "`in_reply_to` … never persisted as its own field and never appears in a comment's response body"
  → the reply relationship **is** persisted (as the immutable `ancestors` path) and **is** returned.
- "the server prepends the same reply link … to the front of `content` before saving" → the server
  stores `content` unchanged; the reply relationship is structured data, and the prefix is rendered
  by readers.
- "no parent/child relationship, thread, or new field is created or stored anywhere" → an immutable
  `ancestors` id-list is stored; the thread stays flat/unthreaded in presentation.
- Edge case "Replying inserts the link into the compose field … the author can freely edit or delete
  it" → replaced by a dismissible "replying to" chip; `content` is not pre-seeded.

**Newest-first ordering (2026-07-20 Revision) — spec-writer to update `description.md`.** The
product owner reversed the list order to newest-first everywhere. The following current
`description.md` statements are now stale and should be updated (behavior only; no mechanism change):

- Acceptance criterion "listed in chronological order (oldest first) with pagination" → newest-first
  with pagination.
- Acceptance criterion "appear in that work item's detail view, ordered oldest first" → ordered
  newest-first.
- UI/UX "Thread rendered oldest-first" → rendered newest-first.
- UI/UX "the new comment appears at the bottom of the thread" and "Add Comment form is pinned at the
  bottom" → the new comment appears at the top; the Add-Comment form is pinned at the top.
- UI/UX "Submitting posts an ordinary new comment at the bottom of the (flat, oldest-first) thread"
  → at the top of the (flat, newest-first) thread.

Ancestor lineage order (`GET /comments/{id}/ancestors`, root-first) is unaffected — it is a lineage
path, not a chronological list.

## Proposed API Surface

Proposed here for the implementors to build against; the global `docs/api-contract.md` (LOCKED)
stays untouched and receives this as a merge (bump to v1.7) at Reconcile. No auth (localhost, by
design). Errors follow the app's `DomainError`→HTTP mapping.

Pagination follows the app convention: `page` (int, default 1, ≥1) + `limit` (int, ≥1, ≤100), with
the standard `{ data, pagination }` envelope where `pagination = { total, page, limit, totalPages }`.
Comment lists take a **generous default `limit` of 50** so a typical thread (≤ ~50) returns in one
page. Filters are passed as query params. **Lists (and detail-composed comment lists) are ordered
newest-first** — descending `(created_at, id)` — per the ordering Revision above; pagination walks
newest → oldest.

**Comment REST endpoints** (path params in `{…}`; query params listed per endpoint)

- `POST /v1/stories/{storyId}/comments` — create on a story. Path: `storyId`. Body: `CreateComment`.
- `GET  /v1/stories/{storyId}/comments` — list. Path: `storyId`. Query: `page`, `limit`,
  `label_key`, `label_value`, `after_id`, `descendant_of` (all optional).
- `POST /v1/tasks/{taskId}/comments` — create on a task. Path: `taskId`. Body: `CreateComment`.
- `GET  /v1/tasks/{taskId}/comments` — list. Path: `taskId`. Query: same as the story list.
- `POST /v1/milestones/{milestoneId}/comments` — create on a milestone. Path: `milestoneId`.
  Body: `CreateComment`.
- `GET  /v1/milestones/{milestoneId}/comments` — list. Path: `milestoneId`. Query: same as above.
- `GET    /v1/comments/{id}` — fetch one. Path: `id`. No query.
- `GET    /v1/comments/{id}/ancestors` — ordered (root-first) ancestor comment bodies. Path: `id`.
  No query (returns the full lineage; unpaginated — bounded by thread depth).
- `PUT    /v1/comments/{id}` — update. Path: `id`. Body: `UpdateComment`.
- `DELETE /v1/comments/{id}` — delete. Path: `id`. No body.

**List query parameters**

- `page` / `limit` — standard pagination (defaults 1 / 50).
- `label_key` (string, optional) — return only comments carrying a label with this key.
- `label_value` (string, optional) — return only comments carrying a label with this value.
- `after_id` (comment id, optional) — **watermark for incremental retrieval**: returns only comments
  created strictly **after** (newer than) the referenced comment — keyset
  `(created_at, id) > (ref.created_at, ref.id)`. This predicate is unchanged by the newest-first
  Revision (it is orthogonal to display order); the matched set is simply returned newest-first like
  every other list. Lets an agent poll "what's new since I last read" by passing the id of the
  newest comment it has seen (now the first item in the list). Combines with the other filters and
  pagination. If the referenced comment is not found → 404 (see the deleted-watermark gotcha below).
- `descendant_of` (comment id, optional) — returns the sub-thread beneath the referenced comment
  (comments whose `ancestors` contains it), via the dialect-aware JSON-array filter.

**Shapes** (field-level; final TypeScript interfaces land in the contract at Reconcile)

- `CreateComment` (request body): `content` (string, 1–50,000, required), `author_role` (string,
  non-empty, required), `labels` (array of `{key, value}`, optional), `in_reply_to` (comment id
  string, optional).
- `UpdateComment` (request body): `content` (string, optional), `labels` (array of `{key, value}`,
  optional). Any `author_role` / `ancestors` in the body is ignored (immutable).
- `Comment` (response): `id`, `container_type` (`story` | `task` | `milestone`), `container_id`,
  `content`, `author_role`, `labels` (`{key, value}[]`), `ancestors` (comment id string array,
  root-first, empty for a top-level comment), `created_at`, `updated_at`.
- The ancestors endpoint returns a bare ordered `Comment[]` (root-first), not a paginated envelope.

**Comment MCP tools** (behavior-identical mirror): `create_comment`, `list_comments`,
`get_comment`, `get_comment_ancestors`, `update_comment`, `delete_comment`. Create/list take
`container_type` + `container_id` as arguments (rather than a path). `list_comments` accepts the
same query params (`page`, `limit`, `label_key`, `label_value`, `after_id`, `descendant_of`);
`create_comment` carries the same fields as `CreateComment`.

**Settings surface change** (extends existing endpoints — no new routes): `default_web_ui_role`
(scalar string) is added to the effective-settings and system/project-overrides responses and to
the settings update body; the settings MCP tools mirror it. On write it must be a member of the
effective `participant_roles` for the scope.

## Ordered Tasks

1. **TASK-001: Comment model, migration, and repository** (backend-developer) — new `comments`
   domain data layer: the polymorphic container model with the chronological index and the immutable
   `ancestors` materialized path, the `0011` migration creating the table, and the repository
   (paginated oldest-first list with label filtering and the ancestors-contains sub-thread filter,
   CRUD, the `list_by_ids` ordered-fetch helper, and the cascade pair).
2. **TASK-002: Comment service and schemas** (backend-developer, depends on TASK-001) — CRUD
   business logic, the create validation precedence, `in_reply_to` existence + same-container
   validation and the derivation/persistence of `ancestors`, immutability of `author_role` and
   `ancestors` on update, the `get_ancestors` traversal method, the container reader Protocols, and
   the `CommentReader` Protocol. Response exposes `ancestors`, `container_type`, and `container_id`.
3. **TASK-003: Comment REST controller, MCP tools, and DI wiring** (backend-developer, depends on
   TASK-002) — the JSON REST surface (including `GET /comments/{id}/ancestors`), behavior-identical
   MCP tools with full parity (including `get_comment_ancestors`), and container registration.
4. **TASK-004: Detail composition and cascade delete** (backend-developer, depends on TASK-002) —
   wire `CommentReader` into story, task, and milestone services so their detail views return
   comments oldest-first and their deletes cascade comment removal.
5. **TASK-005: `default_web_ui_role` setting and `operator` seed** (backend-developer, no
   dependencies) — add the scalar setting to the settings schema/service/controller/MCP with
   effective-`participant_roles` validation, and edit the settings seed to add `operator` and the
   system default row.
6. **TASK-006: Comments API client and hooks** (frontend-developer, depends on TASK-003) — endpoint
   functions, query/mutation hooks, types (including `ancestors`), and cache invalidation.
7. **TASK-007: CommentsSection with forms, actions, and host mounts** (frontend-developer, depends
   on TASK-006) — the reusable section, Add/Edit forms, inline Edit/Reply/Delete/Copy-link actions,
   the reply chip on compose and the reply-prefix line (from `ancestors[-1]`) on rendered comments,
   count badge, and mounting in all three host views.
8. **TASK-008: `@role` mention combobox and render highlighting** (frontend-developer, depends on
   TASK-007) — the accessible autocomplete in the content field plus render-time mention
   highlighting.
9. **TASK-009: Comment permalink resolver and deep-linking** (frontend-developer, depends on
   TASK-007) — the `/comments/:id` resolver route, scroll-into-view + highlight, shared by
   standalone permalinks and the reply-prefix jump link.
10. **TASK-010: Default Web UI role settings UI** (frontend-developer, depends on TASK-005) — the
    single-value dropdown row in the System and Project settings views.
11. **TASK-011: Automated tests for comments and the new setting** (qa-automation, depends on
    TASK-001–005) — coverage of the comment API (REST + MCP parity), `in_reply_to` validation and
    `ancestors` derivation, ancestor traversal (`get_ancestors`), the ancestors-contains sub-thread
    filter (`descendant_of`), the `after_id` watermark (including the deleted-watermark 404), cascade
    delete, detail composition, label filtering, and `default_web_ui_role` validation.

### Follow-up tasks — newest-first ordering Revision (2026-07-20)

Delivered as follow-ups against the already-`Done` tasks (see the Revision section); the shipped
`Done` tasks are not rewritten.

12. **TASK-012: Flip comment list ordering to newest-first** (backend-developer, no dependencies —
    all prerequisite backend tasks are `Done`) — reverse the sort of the comments repository's
    paginated container list and its enumerate-all helper (which also feeds detail composition) to
    descending `(created_at, id)`; leave the `after_id` watermark keyset predicate and name
    unchanged. Supersedes in part the ordering behavior of TASK-001 and TASK-004.
13. **TASK-013: Render comments newest-first and move the Add-Comment form to the top**
    (frontend-developer, depends on TASK-012) — the `CommentsSection` thread renders newest-first
    (server order), a newly-created comment appears at the top after refetch, and the pinned
    Add-Comment form moves above the thread. Supersedes in part the ordering/form-placement behavior
    of TASK-007.
14. **TASK-014: Update automated tests for newest-first ordering** (qa-automation, depends on
    TASK-012) — invert the ordering assertions in the comment API tests: container list and detail
    composition now assert newest-first; the `after_id` watermark still returns the newer-than-ref
    set (now newest-first) and the deleted-watermark 404 is unchanged; ancestor lineage stays
    root-first. Re-run the suite green. Supersedes in part the ordering assertions of TASK-011.

## Planned ADRs

| Decision Area | Trigger Condition |
|---|---|
| Single-value (scalar) setting in the shared settings store | Confirmed once `default_web_ui_role` ships as a keyed setting reusing the dictionary store's row/override machinery — a reusable pattern future author/creator-field stories will follow |
| Persisted, immutable materialized ancestor path for replies (over the spec's schema-free prepend-to-content model) | Confirmed once replies ship as a stored `ancestors` id-list kept out of `content` — a deliberate override of a spec-prescribed mechanism |
| `operator` participant role — human-vs-agent distinction in `participant_roles` | Confirmed once `operator` seeds as an ordinary dictionary entry usable anywhere `participant_roles` applies |

## Constraints & Gotchas

- **`author_role` is mandatory for every caller** — the server never substitutes a default for a
  missing or empty value, for any surface including the Web UI. The Web UI meets the requirement by
  pre-filling from `default_web_ui_role`, but it remains the Web UI's responsibility to send a
  non-empty value like any other required field.
- **`author_role` and `ancestors` are immutable** after creation; only `content` and `labels` are
  updatable. An attempted change to either is silently ignored, matching Attachments' `author_role`.
- **`ancestors` is derived once at create** from the referenced parent (`parent.ancestors +
  [parent.id]`); the input `in_reply_to` is validated (existence + same-container) and then reflected
  only through the computed path. `content` is stored exactly as submitted — no server-side prefixing.
- **The reply graph is cycle-free by construction** — a reply targets an already-existing (older)
  comment and `ancestors` is immutable, so lineage traversal always terminates; and the whole chain
  is inductively in the same container as the comment.
- **Referential integrity of ancestor ids is not DB-enforced** — a reference to a later-deleted
  comment lingers benignly in descendants' `ancestors`; readers degrade gracefully.
- **`after_id` watermark & the deleted-watermark case:** `after_id` is resolved to the referenced
  comment's `(created_at, id)` keyset position, so a not-found `after_id` returns 404. An agent
  polling with a watermark whose comment was later deleted therefore gets a 404 rather than "all
  comments"; callers that need to survive a deleted watermark should re-list without it. (A future
  robustness option — accepting a raw timestamp cursor instead of an id — is out of scope for v1.)
- **Volume assumption:** a single work item is expected to hold at most ~50 comments, so the
  container `list` returns a whole thread cheaply. Set a generous default page size for comment lists
  so the typical thread comes back in one page; pagination remains only as a safety net.
- **The permalink is root-relative** (`/comments/{id}`) precisely so the backend stays
  origin-agnostic; the Web UI resolves it via a dedicated route and turns it absolute only when
  copying to the clipboard.
- **`default_web_ui_role` validates against the *effective* `participant_roles`** for its scope, and
  only on write. An inherited system default can legitimately sit outside a project's overridden
  `participant_roles` set; this is benign because the comment's own `author_role` is free-form and
  never dictionary-validated.
- **Clear-override for the new key inherits the existing known gap** (no REST/MCP clear-override
  route; STORY-002) — this story does not close it.
- **The `@role` combobox is the app's first non-native dropdown** — the WCAG 2.1 AA ARIA combobox
  pattern is a hard requirement, not a nicety, since every other picker in the app is a native
  `<select>`.
- **Mentions are plain text** — the API stores and returns `content` exactly as received;
  recognition/highlighting happens only at render time, so a mention whose role was later removed
  simply renders as plain text with no data change.
- **Clean-install migration** — the settings seed is edited in place (pre-production DB); the chain
  is re-run fresh rather than patched with a backfill migration.
