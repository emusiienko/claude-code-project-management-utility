# ADR-027: Sessions as a distinct top-level app mode with its own project-selection shell

**Date**: 2026-07-30
**Status**: Accepted

**Decision**: Sessions is built out as a **distinct top-level application mode** reached through the app-switcher's existing `Sessions` entry (established by ADR-014) — a separate space beside Task Manager over the shared project namespace (the Confluence-beside-Jira model) — **not** a fourth per-project sub-navigation tab under `ProjectShell` alongside Stories / Board / Milestones. Within Sessions mode the layout mirrors Task Manager's: its own left-placed project-selection surface (a project list with last-visited memory, backed by its own local-storage keys kept separate from Task Manager's) and a main view showing the chosen project's sessions, with a nested project-scoped Session Detail view. Sessions routes live in the Sessions subtree (under `/sessions`), clear of Task Manager's `/projects/:projectId/*` tree. The two global overlays (Projects management and Config, ADR-025) stay available in Sessions mode exactly as in Task Manager: the in-mode project sidebar selects *which project's sessions to view*, a role distinct from the Projects overlay that *manages* projects. Clicking a session's linked story or linked task leaves Sessions and navigates to that item's own detail view in Task Manager.

This **ratifies ADR-014's two-app app-switcher model** for the Sessions half (which shipped only as a placeholder in STORY-016) and **reverses the interim sub-navigation-tab recommendation** that an earlier revision of STORY-009's implementation plan had considered. It does not supersede ADR-014 (whose four-tab narrative was already revised to three tabs by ADR-025); it fills in the Sessions app that ADR-014 named but left unbuilt.

**Options Considered**:
- **A fourth per-project sub-nav tab** under `ProjectShell` (Stories / Board / Milestones / Sessions), reusing Task Manager's project sidebar and project chrome directly.
- **A distinct Sessions app mode with its own parallel project-selection shell** (chosen), reached via the app-switcher's `Sessions` entry.
- **A flat, cross-project Sessions list** with no project selection (the pre-project-scoping forward-spec in `requirements_web.md`): rejected as incompatible with the mandatory project scope (ADR-026).

**Rationale**:
- **The app-switcher already promised two apps.** ADR-014 introduced `Task Manager` / `Sessions` as sibling modes over a shared project namespace; Sessions was a placeholder awaiting this story. Growing that placeholder into a real mode honors the shell architecture already in place rather than bolting Sessions onto the per-project tab set.
- **Sessions is a peer workspace, not a facet of one project's work items.** Stories, Board, and Milestones are three views of the *same* project's work items; a session is a separate kind of record (an orchestrator working session) that merely *references* stories/tasks. Placing it as a fourth work-item tab would misrepresent it as another lens on the same data and would couple its routes and chrome to `ProjectShell`.
- **A parallel shell keeps concerns cleanly separated.** A Sessions-mode sidebar with its own last-visited-project and collapsed-state keys means selecting a project to view sessions never perturbs Task Manager's selection, and vice versa — two independent project-selection surfaces for two independent apps, mirroring how the global Projects overlay's "manage projects" concern is already kept distinct from either sidebar's "choose active project" concern.
- **Cross-linking still lands in Task Manager.** Because a linked story/task's canonical detail lives in Task Manager, the linked indicators navigate out of Sessions into that mode — reinforcing that Sessions is a peer app over the same projects, not a self-contained silo.

**Trade-offs**:
- Sessions mode duplicates the shape of Task Manager's shell (a project sidebar + index redirect + project-existence gate) rather than sharing one shell component, so the two shells must be kept in visual/behavioural sync by convention — a second copy of the project-selection machinery, accepted as the cost of independent navigation.
- The app now carries two project-selection surfaces plus the global Projects overlay — three project-related controls whose distinct roles a new engineer must learn (view-selector in each mode vs. the manage-projects overlay) to avoid conflating them.
- This is a hard-to-reverse frontend-shell decision: collapsing Sessions back into a sub-nav tab would mean rewriting its routing subtree and moving its detail view under `ProjectShell`. Judged acceptable — it follows the direction ADR-014 already set.
