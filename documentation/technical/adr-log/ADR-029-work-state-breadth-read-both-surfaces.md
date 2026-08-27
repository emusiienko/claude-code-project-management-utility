# ADR-029: Project work-state as an aggregate breadth read on both REST and MCP

**Date**: 2026-08-01
**Status**: Accepted

**Decision**: Add a single aggregate "work-state" read — `GET /projects/:id/work-state` and the
`get_project_work_state` MCP tool — that returns a project together with all of its stories, and for
each story its tasks (a shallow core-field subset) plus that story's per-status task-count aggregate,
in one call. The operation is a deliberate **breadth** complement to the existing per-entity CRUD and
`get_*_detail` reads: it fans wide (the whole project tree, one level of tasks) but stays **shallow**
(it structurally omits attachments, comments, and links). It is exposed identically on REST and MCP
over one `ProjectService.get_work_state` method, preserving the project's 1-to-1 tool↔endpoint
invariant. It is purely additive — it replaces nothing; the detail tools remain the way to reach
depth for a specific entity.

**Options Considered**:
1. **No new operation — keep the fan-out.** Agents assemble a project's work state by calling
   `list_projects` → `list_stories` → `list_tasks` (→ `get_task_detail` per task), a
   `1 + 1 + N + N×M` sequence of round trips.
2. **Extend an existing detail read.** Inline stories+tasks into `get_project` / a project detail,
   or deepen `get_story_detail` to carry tasks.
3. **A dedicated aggregate breadth read on both surfaces (chosen).** A new shallow project→stories→
   tasks composite, exposed on REST and MCP, that omits heavy per-entity payloads by construction.

**Rationale**:
- **Startup cost.** The primary agent workflow is "load a project's current state to decide what to
  do next." Option 1 forces an `1 + 1 + N + N×M` fan-out — many MCP round trips per session start.
  One breadth call collapses that to a single request plus a few targeted detail reads only on the
  one entity an agent is about to act on.
- **Breadth and depth are distinct read shapes, and conflating them is the trap.** Detail reads
  (`get_story_detail`, `get_task_detail`) are deep and narrow — one entity with all its side
  collections. Work-state is wide and shallow — the whole tree, no side collections. Making
  work-state omit `content`, `labels`, attachments, comments, and links *structurally* (the fields
  are absent from `ProjectWorkState`/`WorkStateStory`/`WorkStateTask`, not merely returned empty)
  keeps a "breadth" read from silently degrading into a heavy one as a tree grows. Option 2 would
  either bloat an existing read for every caller or entangle the two shapes.
- **Additive, not a replacement.** Depth stays served by the existing detail tools. An agent uses
  work-state to orient, then one detail call to inspect the single story/task it will change. Nothing
  existing changed shape, so the LOCKED contract took only an additive v1.9 note.
- **Both surfaces, one service.** MCP is the primary access surface for agents; the invariant that
  every operation is a behavior-identical REST endpoint + MCP tool over one shared service (ADR-003)
  is preserved by putting the composition in `ProjectService` and keeping the REST route and MCP tool
  as thin mirrors.
- **Composed without N+1.** The aggregate reads the stories and tasks data layers through two narrow
  local Protocols (the "each other's data layer, never another app's service" rule) with batched
  queries — one unpaginated story fetch, one `story_id IN (...)` task fetch, one
  `GROUP BY (story_id, status)` count — so the whole tree is four queries regardless of story/task
  count, satisfying the efficiency criterion the fan-out violated.

**Trade-offs**:
- **A second read shape for the same data.** Tasks and stories now have a full shape (detail/list)
  and a shallow work-state shape; the field subset is a judgment call the service owns and must keep
  in sync as fields evolve. Accepted: the alternative (one shape for both breadth and depth) is worse
  — it makes every breadth read pay for depth.
- **Unpaginated by design.** Work-state reads the whole project tree as one logical operation with no
  page/limit — correct for the ≤1,000-row target scale and the "load the project" use case, but it is
  not a general-purpose paginated list. Very large projects would want the paginated `list_*`
  endpoints, which remain available.
- **The composition lives in `ProjectService`, not `StoryService`/`TaskService`.** This follows the
  existing precedent (`StoryService.get_aggregate` depends on the task repository directly) and
  required moving the `project_service` provider later in the DI container so its new cross-domain
  Protocol dependencies are already bound — a small ordering constraint, consistent with how
  `story_service`/`task_service` are already declared late.
