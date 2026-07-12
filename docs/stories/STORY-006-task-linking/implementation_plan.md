# Implementation Plan: STORY-006 — Work Item Linking

## Context

STORY-006 lets agents and the orchestrator record typed, directed relationships between work items
so the semantic structure of the pipeline is visible without being enforced. The utility stores links
as facts only — it never blocks a task or story from being worked on because of a link. Two linking
surfaces ship together because they share one semantic model:

- **task_links** — a directed typed link between two tasks in the **same story**.
- **story_links** — a directed typed link between two stories in the **same project**, with the same
  schema, validation, and enrichment shape as task_links.

Both surfaces close a gap already staged in the codebase:

- `GET /tasks/:id/detail` currently returns an **empty** `links` array (the tasks service composes no
  links yet — see the STORY-005 reconcile note in architecture.md). This story populates it.
- `GET /stories/:id/detail` currently composes only attachments/comments (empty until STORY-007/008)
  and has **no** `links` field at all. This story adds `links` to `StoryDetail`.
- The Task Detail Modal and the Story slide-over right panel each already render a "Links — coming in
  STORY-006" placeholder. This story replaces both with live sections.

This is the codebase's **first many-to-one-domain link entity** and the first domain whose primary
resource is a relationship rather than a work item. It establishes the link-domain pattern that a
future dependency view (`GET /tasks/:id/dependencies`, also staged empty) will reuse.

### Contract status — read before implementing

The LOCKED api-contract v1.0 already specifies the **Task Links** surface
(`POST /tasks/:taskId/links`, `GET /tasks/:taskId/links`, `DELETE /task-links/:id`, plus the
`TaskLink` / `EnrichedTaskLink` entities and `TaskDetail.links`). Two deltas exist between the story
and the LOCKED contract; both are resolved in favour of the story and logged for ratification at
Reconcile (the contract is not edited during Feature Design):

1. **Task-link scope is the story, not the project.** The LOCKED contract note reads "source and
   target must be in the same project." STORY-006 narrows this to the **same story** (`same story_id`),
   with a cross-story attempt rejected. Two tasks in the same story are always in the same project, so
   the narrower rule strictly satisfies the contract's wording while matching the story's explicit
   acceptance criteria. Implement the **same-story** rule.
2. **Story Links are entirely new to the contract.** `story_links`, `GET /stories/:storyId/links`,
   `DELETE /story-links/:id`, `StoryLink` / `EnrichedStoryLink`, and `StoryDetail.links` are not in
   v1.0. They are specified in this plan and in the story; the global contract is updated only at
   Reconcile.

The frontend contract types (`TaskLink`, `EnrichedTaskLink`, `TaskDetail.links`) already exist; the
story-link equivalents and `StoryDetail.links` do not and are added by the frontend query-layer task.

## Technical Approach

### Two parallel link domains, one shared shape

`task_links` and `story_links` are two independent domain packages with identical structure. They are
kept separate (not generalised into one polymorphic "links" table) because each has a distinct parent
scope, a distinct enrichment target, and a distinct set of endpoints — a shared table would need a
discriminator and would couple two work-item domains through one row type. The duplication is
mechanical and small; two clean vertical slices are simpler to reason about and test than one
conditional one. Each package owns its model, repository, service, schema, controller, and MCP tools,
following the established per-domain pattern.

Each link is a **directed** row: `source_*_id` → `target_*_id` with a `link_type`. Direction is
meaningful ("A depends on B" ≠ "B depends on A") and is preserved on read as an `outbound` / `inbound`
marker relative to the item being viewed.

### Validation rules (identical for both domains, applied in the service)

For a create on the link between a **source** item and a **target** item:

1. **Both items exist** — source and target are loaded; a missing item is a 404.
2. **Same scope** — task-links: both tasks share the same `story_id`; story-links: both stories share
   the same `project_id`. A mismatch is a 422 ("Cannot link tasks from different stories." /
   "Cannot link stories from different projects.").
3. **No self-link** — `source_id == target_id` is a 422 ("A task cannot link to itself." / "A story
   cannot link to itself.").
4. **link_type in the effective dictionary** — the owning project's effective `link_types` dictionary
   is resolved (task-link: project via `task → story → project`; story-link: the story's project) and
   the value validated; a value outside it is a 422. Dictionary resolution reuses the existing
   `EffectiveDictionary` Protocol already injected into the stories/tasks services.
5. **No duplicate** — a link with the same (`source_id`, `target_id`, `link_type`) already existing is
   a 409 ("This link already exists.").

Order matters for the error the caller sees: existence (404) is checked before scope/self/dictionary
(422) before duplicate (409). Field-shape validation (non-empty `target_id`, non-empty `link_type`)
stays in the Pydantic input schema and surfaces as 422 via request-validation, per the established
layering (ADR-011). ID coercion stays in `BaseRepository`.

### Listing and enrichment

`GET /tasks/:taskId/links` and `GET /stories/:storyId/links` return **enriched** links: each row
carries a `direction` (`outbound` when the viewed item is the source, `inbound` when it is the target)
and a `linked_{task,story}` summary (`id`, `title`, `status`). The list supports
`direction` (`outbound` | `inbound` | `both`, default `both`) and `link_type` filters plus standard
pagination.

Enrichment is a **join within the same domain's read**: the link repository fetches the link rows for
the viewed item (as source and/or target per `direction`), then batch-loads the linked items' summary
columns (`id`, `title`, `status`) in one query keyed by the set of counterpart IDs — never a
per-row lookup (no N+1). The linked-item lookup reads the task/story tables directly through the link
repository's own session; it does not call the tasks/stories service, keeping the read self-contained.

### Detail composition — cross-domain via Protocol

`GET /tasks/:id/detail` and `GET /stories/:id/detail` must return `links` populated. This mirrors the
existing `stories service → tasks data` aggregate pattern: the **tasks service** gains an injected,
runtime-checkable `TaskLinkReaderProtocol` (duck-typed to the task-link service/repository's "list
enriched links for a task" method) and the **stories service** gains a `StoryLinkReaderProtocol`. The
detail method asks the reader for the item's enriched links (both directions) and places them on the
detail response. The work-item services never import the concrete link packages — only the Protocols —
so there is no circular import and the composition direction stays one-way (work-item service → link
data), consistent with the module-relations rules in architecture.md.

The link readers are wired on `AppContainer`; the task-link/story-link services must be declared and
passed into the tasks/stories service providers the same way `task_repository` is passed as the
`task_counter` today.

### Cascade delete — application-level, not FK-reliant

Deleting a task must delete all its task links (as source or target); deleting a story must delete all
its story links. The schema declares the FKs `ON DELETE CASCADE` on both sides (inline, toward the
already-existing parent, per ADR-010). **However, `ON DELETE CASCADE` is inert on SQLite as built**
(the `PRAGMA foreign_keys = ON` gap logged in architecture.md § Known Divergences), so relying on the
FK alone would leave orphaned link rows on the default SQLite dialect. Following the precedent set by
milestone-delete (which bulk-clears story links in the service rather than trusting the cascade), the
**tasks service delete** and **stories service delete** must explicitly instruct the corresponding
link reader/deleter to remove all links referencing the item (either side) before/as part of the
delete, so the "no orphaned link records" acceptance criterion holds on **both** dialects. This is an
additional Protocol method on the same injected reader (a "delete all links for this {task,story} id"
operation). The FK cascade stays declared as defence-in-depth for PostgreSQL and for the eventual
PRAGMA fix.

### Frontend

The frontend consumes the REST contract only. Work is layered per the established convention
(endpoints → hooks → components), split across four tasks:

- **API + query layer** — contract types for `StoryLink` / `EnrichedStoryLink` and `StoryDetail.links`
  (the task-link types already exist); endpoint functions for the task-link and story-link create /
  list / delete operations; centralized paths; cache keys; TanStack Query hooks (list query + create /
  delete mutations) for both surfaces, invalidating the relevant detail/link queries on mutation.
- **Task links UI** — the Links section in the Task Detail Modal: enriched list with direction
  indicator + `link_type` badge + clickable linked-task title (navigates to that task's detail modal
  route), an Add-link form (target-task search + `link_type` dropdown from effective settings), and a
  per-row delete with confirmation.
- **Story links UI** — the Links section in the Story slide-over right panel: same shape, clickable
  linked-story title (navigates to that story's slide-over route), Add-link form (target-story search
  + `link_type` dropdown), per-row delete with confirmation.
- The `link_type` dropdowns read the project's effective `link_types` from the settings-effective
  query already in cache on both surfaces (no extra network call).

Target selection is a search-by-title control scoped to the correct set (tasks in the same story;
stories in the same project), reusing the existing task-list and story-list queries.

## Ordered Tasks

1. **TASK-001: task_links backend domain** (backend-developer) — new `task_links` package (model,
   repository with batch enrichment + delete-by-task-id, service with the five validation rules,
   schema, controller `POST/GET /tasks/:taskId/links` + `DELETE /task-links/:id`, MCP tools); wire on
   the container and router.
2. **TASK-002: story_links backend domain** (backend-developer) — new `story_links` package, same
   structure and rules scoped to stories/project (`POST/GET /stories/:storyId/links` +
   `DELETE /story-links/:id`), MCP tools; wire on the container and router. Depends on TASK-001 only
   for the shared enrichment/validation shape to copy (no runtime dependency between the two).
3. **TASK-003: detail composition + cascade delete wiring** (backend-developer, depends on TASK-001,
   TASK-002) — add the `TaskLinkReaderProtocol` / `StoryLinkReaderProtocol` to the tasks/stories
   services; populate `TaskDetail.links` and `StoryDetail.links`; add application-level link cleanup to
   task-delete and story-delete; add the migration creating both link tables (append revision, inline
   `ON DELETE CASCADE` FKs, uniqueness + direction indexes).
4. **TASK-004: frontend link API + query layer** (frontend-developer, depends on TASK-001, TASK-002) —
   story-link contract types, `StoryDetail.links`; endpoint functions for both surfaces; paths; cache
   keys; TanStack Query hooks (list + create/delete) for both surfaces.
5. **TASK-005: task links UI in Task Detail Modal** (frontend-developer, depends on TASK-004) — live
   Links section replacing the placeholder: enriched list, direction + type badge, clickable navigate,
   Add-link form, delete-with-confirmation.
6. **TASK-006: story links UI in Story slide-over** (frontend-developer, depends on TASK-004) — live
   Links section in the right panel replacing the placeholder, same shape, clickable navigate to the
   linked story's slide-over.
7. **TASK-007: automated tests** (qa-automation, depends on TASK-001…TASK-006) — backend + frontend
   coverage of both link domains, all validation rules, enrichment, detail composition, and cascade
   cleanup on both dialects.

Backend TASK-001 and TASK-002 may proceed in parallel after the shape of TASK-001 is settled; TASK-003
gates on both. Frontend TASK-005 and TASK-006 may proceed in parallel after TASK-004.

## Planned ADRs

| Decision Area | Trigger Condition |
|---|---|
| Two separate link domains vs one polymorphic link table | Record if the mechanical duplication between task_links and story_links is confirmed acceptable at implementation (vs a shared discriminated table) — a non-obvious structural choice a future engineer would question. |
| Application-level link cleanup on parent delete under the SQLite FK gap | Record if link cleanup is implemented in the work-item services (not relying on FK cascade), extending the milestone-delete precedent to a second/third case — reinforces the pending PRAGMA-fix decision. |
| Task-link scope narrowed from project (LOCKED contract) to story (STORY-006) | Record at Reconcile as the contract revision that ratifies the same-story rule and adds the story_links surface. |

## Constraints & Gotchas

- **SQLite FK cascade is inert (Known Divergences).** Do not rely on `ON DELETE CASCADE` to clear link
  rows on the default dialect — the parent-delete cleanup must be explicit in the tasks/stories
  service (mirroring milestone-delete). Declare the FK cascade anyway for PostgreSQL and the future
  PRAGMA fix.
- **No circular imports.** Work-item services depend on link data only through runtime-checkable
  Protocols injected via the container; link packages are never imported by the tasks/stories
  services. Link services may read the task/story tables directly through their own repository session
  for enrichment (a read of another domain's table, not a call into its service) — this matches how
  milestone/story repositories already read across tables.
- **Container declaration order.** The link service providers must be declared before the tasks/stories
  service providers that receive them (the container already relies on this ordering — `task_repository`
  is declared before `story_service`). New packages must be added to the `container.wire(packages=[…])`
  list in `main.py` or their MCP tools will not self-register.
- **Error precedence.** Existence (404) → scope/self/dictionary (422) → duplicate (409). Return the
  contract-specified messages verbatim ("A task cannot link to itself.", "This link already exists.",
  etc.).
- **Enrichment must be batched.** Load linked-item summaries in one query per direction over the set of
  counterpart IDs — never one query per link row.
- **Direction semantics.** `outbound` = viewed item is the source; `inbound` = viewed item is the
  target. `both` returns the union with each row correctly tagged.
- **`AppPath` enum.** `DELETE /task-links/:id` and `DELETE /story-links/:id` are top-level paths
  (`task-links`, `story-links`); add the corresponding entries when wiring the routers. The create/list
  routes hang off the existing `tasks` / `stories` prefixes.
- **Contract is not edited now.** Keep the story-link additions and the same-story narrowing in this
  plan; the global `docs/api-contract.md` is updated only at Reconcile.
- **CORS.** No new HTTP methods are introduced (POST/GET/DELETE already in the allow-list).
