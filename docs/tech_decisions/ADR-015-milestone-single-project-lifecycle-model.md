# ADR-015: Milestone single-project ownership + lifecycle status

**Date**: 2026-07-11
**Status**: Accepted

**Decision**: A milestone belongs to **exactly one project** (a single non-null `project_id` FK, `ON DELETE CASCADE`) and carries a **lifecycle status** — `planned` (default) → `active` → `finished`. This supersedes the original v1.0 model in which milestones were associated with projects **many-to-many** (a `milestone_project` join table, `project_ids[]` on the wire) and had **no status**. The `milestone_project` join table is not created; a story references at most one milestone via its nullable `story.milestone_id` FK (`ON DELETE SET NULL`). Milestone names are unique case-insensitively **within a project**. `project_id` is immutable after create (`PUT` accepts only `name`/`description`). This is a **contract revision to v1.2** for the Milestones domain only; every other domain's contract is unchanged.

**Options Considered**:
- **M:N milestone↔project with no status** (original v1.0 shape): a `milestone_project` join, `project_ids[]` on create/update, milestones shared across projects, no lifecycle.
- **Single owning project + lifecycle status** (chosen): one `project_id` per milestone, a three-value `status` column, no join table.
- Single owning project but **no status** (status tracked only in the UI / derived): rejected because "at most one active milestone per project" and the Board default-filter behaviour both need a server-owned status.

**Rationale**:
- The story's actual requirements are single-project: a milestone belongs to one project, only that project's stories may be assigned, and a project has at most one `active` milestone. The M:N join modelled a generality the product never needed.
- Removing the join table removes a whole entity, its endpoints, and its cross-project edge cases — fewer moving parts, simpler queries (`story_count` is a single grouped `COUNT` over `story.milestone_id`).
- A server-owned lifecycle status is required for the Board's "default to the active milestone's stories" behaviour and for the single-active invariant; the UI cannot own it because MCP agents share the same state.
- The change is contract-breaking but was made **before any milestone code shipped** (the domain was a placeholder), so there is no data or client to migrate — only the deferred `story.milestone_id` FK (ADR-013) to finally wire up.

**Trade-offs**:
- A milestone can no longer span projects. If a future need arises to group stories across projects, that becomes a separate concept (e.g. a cross-project "initiative"), not a milestone — accepted, as it is out of V1 scope.
- The v1.2 Milestones shape diverges from the otherwise-LOCKED v1.0 contract, so readers must treat Milestones as the one domain whose contract was revised. Documented explicitly in `docs/api-contract.md`.
- `project_id` immutability means "move this milestone to another project" is delete-and-recreate, not an edit — acceptable given milestones are lightweight and optional.
