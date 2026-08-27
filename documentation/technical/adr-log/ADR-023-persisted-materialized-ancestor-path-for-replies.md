# ADR-023: Comment replies use a persisted, immutable materialized ancestor path

**Date**: 2026-07-21
**Status**: Accepted

**Decision**: A comment reply is modeled as an **ordinary flat comment** that carries the identity of
its lineage in a persisted, immutable `ancestors` field — an ordered (root-first) JSON array of
ancestor comment ids, empty for a top-level comment, computed once at creation as
`parent.ancestors + [parent.id]` and never changed thereafter.

- Comment creation accepts one optional, **request-only** input `in_reply_to` (a single parent
  comment id). The service validates the parent exists (404) and shares the same container (422),
  then derives and persists `ancestors`. `in_reply_to` is **not** a stored field and does **not**
  appear in any response — its only effect is the computed `ancestors`.
- `content` is stored **exactly as submitted** — the server never prepends link text or otherwise
  rewrites it.
- The relationship is queryable in both directions: **up** via `GET /comments/:id/ancestors`
  (ordered ancestor bodies, resolved through one `list_by_ids` fetch) and **down** via the list
  endpoint's `descendant_of` filter (comments whose `ancestors` contains a given id, via the
  dialect-aware JSON-scalar-array-contains helper).
- Ancestor ids are held **FK-less** (same polymorphic-container convention as attachments, ADR-020),
  so a deleted ancestor's id lingers harmlessly in descendants' paths and readers skip it.
- The thread stays **presentationally flat** — no nesting/indentation — regardless of depth; a reply
  renders a lightweight "↩ Replying to {author_role}" prefix derived from its direct parent
  (`ancestors[-1]`).

This **overrides the mechanism prescribed in the story's `description.md`**, which specified a
schema-free approach: a request-only `in_reply_to` that the server turns into a Markdown link
prepended to `content`, with nothing new stored. The architect owns the implementation approach; the
*behavioral* intent of the spec (a reply is an ordinary flat comment referencing the original; agents
get reply parity by setting one field; a reference to a deleted comment degrades gracefully) is fully
preserved. See architecture.md § Known Divergences for the specific stale `description.md` acceptance
criteria flagged for the spec-writer.

**Options Considered**:
- **Persisted materialized ancestor path (`ancestors` id-list)** (chosen).
- **The spec's schema-free model**: prepend a reply Markdown link to `content` at create; store no
  relationship; readers/agents parse the id back out of the link URL.
- **A single `parent_comment_id` (adjacency-list) foreign-key-style column**: store only the direct
  parent; walk pointers (recursive query) to assemble a lineage.

**Rationale**:
- **The lineage is self-contained on each comment.** An agent (or the UI) arriving at a single
  comment knows its full ancestry from one field — no walking pointers, no re-fetching the whole
  container, no parsing ids out of prose. This is the decisive advantage over both alternatives.
- **`content` stays clean and freely editable.** Baking a link into `content` (the spec's model)
  entangles the reply relationship with the author's editable text — an edit could silently corrupt
  or drop the "relationship," and the relationship would only ever be as reliable as string-parsing a
  URL out of Markdown. Keeping the relationship as structured data makes it authoritative.
- **Sub-thread queries fall out of the existing JSON-array filter.** "Everything under comment X" is a
  single `descendant_of` list call reusing the dialect-aware JSON containment helper already built for
  labels/ancestors — no recursive CTE, no dialect-specific recursion, no N+1 pointer chase (the
  adjacency-list model's cost).
- **Every reader gets the relationship as data.** Both the Web UI and an MCP agent see `ancestors`
  directly; the agent needs zero knowledge of the Web UI's URL scheme to reply or to traverse.
- **Cycle-free and terminating by construction.** A reply always targets an already-existing (older)
  comment and `ancestors` is immutable, so traversal always terminates; the whole chain is
  inductively in the same container.

**Trade-offs**:
- The reply relationship is now **persisted and returned** — a direct divergence from the spec's
  "never stored, never in the response body" wording. Accepted deliberately; the behavioral contract
  is preserved and the divergence is logged for the spec-writer.
- `ancestors` **duplicates** the parent's whole path into each descendant (a materialized path, not
  normalized). At this feature's scale (a work item holds ~50 comments, shallow reply depth) the
  storage cost is trivial and buys O(1) lineage reads. Accepted.
- Referential integrity of ancestor ids is **not** DB-enforced (FK-less), so a deleted ancestor's id
  dangles in descendants' paths. Accepted — readers degrade gracefully (skip the missing id), the same
  benign "target gone" behavior the permalink mechanism already accepts; matches ADR-020.
- A deep future need — an anchored chronological window ("N comments around comment X") — is not
  served by the ancestor path. Left as a forward-compatible, non-breaking future extension (compute on
  `created_at` via keyset paging); at current scale a caller fetches the thread and slices locally.
