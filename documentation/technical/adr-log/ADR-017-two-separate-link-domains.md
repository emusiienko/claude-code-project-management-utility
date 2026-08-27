# ADR-017: Two separate link domains (task_links, story_links) instead of one polymorphic link table

**Date**: 2026-07-13
**Status**: Accepted

**Decision**: Work-item linking is implemented as **two independent domain packages** —
`task_links` (directed links between two tasks in the **same story**) and `story_links` (directed
links between two stories in the **same project**) — each a full vertical slice (model, repository,
service, schema, controller, MCP tools) with its own table (`task_link`, `story_link`), its own
endpoints (`POST/GET /{tasks|stories}/:id/links`, `DELETE /{task|story}-links/:id`), and its own
migration (`0006_task_link`, `0007_story_link`). The two are **not** generalized into one polymorphic
"links" table with a discriminator column. Both share the same directed-row shape
(`source_id → target_id`, `link_type`), the same five validation rules applied in the same precedence
order (existence 404 → scope/self/dictionary 422 → duplicate 409), and the same batched
direction-aware enrichment (`outbound`/`inbound` + linked-item `{id, title, status}` summary).

This decision also ratifies the **task-link scope narrowing**: the LOCKED v1.0 contract note read
"source and target must be in the same project"; the built rule requires the **same `story_id`**
(cross-story rejected with 422). Two tasks in one story are always in one project, so the narrower
rule strictly satisfies the earlier wording. Story links keep the same-**project** scope. Recorded in
api-contract v1.3.

**Options Considered**:
- **Two separate link domain packages** (chosen).
- **One polymorphic `link` table** with an `item_type` discriminator (`task` | `story`), one service
  branching on type, one set of `/links` endpoints keyed by item type.
- Deferring story_links to a later story and shipping only task_links: rejected — the story bundles
  both surfaces deliberately because they share one semantic model and the UI ships together.

**Rationale**:
- Each link kind has a **distinct parent scope** (same-story for tasks, same-project for stories), a
  **distinct enrichment target** (task table vs story table), and a **distinct set of endpoints**. A
  shared table would need a discriminator on every row and every query, and would couple two
  work-item domains through one row type — a cross-domain coupling this codebase's per-domain
  vertical-slice pattern deliberately avoids.
- The duplication between the two packages is **mechanical and small** (the validation/enrichment
  shape was settled once in `task_links` and copied). Two clean, independently testable slices are
  simpler to reason about than one conditional service that branches on item type in every method.
- It matches the established per-domain package convention (ADR-004): the primary resource of each
  package is one relationship kind, cleanly separable and wired independently on the DI container and
  router.
- Detail composition stays one-way and import-free: the tasks/stories services read link data only
  through runtime-checkable reader Protocols (`TaskLinkReaderProtocol` / `StoryLinkReaderProtocol`)
  declared in the consuming service module and satisfied structurally by the injected link service —
  no concrete link package is imported by a work-item service, so there is no circular import.

**Trade-offs**:
- The mechanical duplication between the two packages must be kept in sync by hand — a change to the
  shared validation precedence or enrichment shape has to be applied in two places. Accepted as the
  cost of decoupling; the shape is small and stable.
- A future third linkable item kind would add a third near-identical package rather than a new
  discriminator value. If the number of link kinds grows beyond two or three, revisit and supersede
  this ADR with a generalized design.
- Two migrations (`0006`, `0007`) rather than one bundled revision — matches the two-package
  structure and keeps each table's DDL with its own domain.
