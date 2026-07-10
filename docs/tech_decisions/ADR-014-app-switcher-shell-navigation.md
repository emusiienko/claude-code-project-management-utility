# ADR-014: App-switcher shell navigation with nested layout shells

**Date**: 2026-07-10
**Status**: Accepted
**Decision**: Replace the flat three-item top nav (Projects `/`, Sessions `/sessions`, Settings `/settings`, established in STORY-002) with a three-level nested layout shell driven by an app switcher:

- **RootLayout** (flat root) owns a top bar with an app-switcher combobox (`Task Manager` / `Sessions`) on the left and a `⚙ Settings` button on the right. `/projects`, `/sessions`, and `/settings` render directly in its outlet with no project chrome.
- **AppShell** (Task Manager mode) renders a collapsible project sidebar beside its outlet; all project-scoped routes (`/projects/:id/*`) render inside it.
- **ProjectShell** renders a four-tab per-project sub-navigation (Stories, Board, Milestones, Settings) plus a nested outlet, and surfaces an inline "Not found" state for unknown project IDs.

Per-project content (Stories list, Board, Milestones placeholder, Project Settings) renders in the ProjectShell outlet. The Story Detail slide-over is a nested child route of the Stories list (`/projects/:id/stories/:storyId`), keeping the list/board mounted and dimmed behind it so a direct visit renders the project view with the slide-over already open. Persisted UI preferences (sidebar collapsed state, last-visited project ID for the `/` redirect, per-story slide-over panel state) are backed by a shared `useLocalStorage` hook.

**Options Considered**:
- Keep the flat three-item top nav and hang new views off `/projects/:id` as before (STORY-002 model)
- Modal/overlay-based story detail decoupled from the route tree
- App-switcher-driven nested layout shells with a route-backed slide-over (chosen)

**Rationale**: The flat top nav mixed two conceptually separate apps (Task Manager and Sessions), gave no project-level context once inside a project, and placed project dictionary overrides under global `/settings` where they did not belong. Composing layout top-down through nested routing shells lets each shell own exactly one concern (top bar, project sidebar, project sub-nav) and lets leaf routes render only their own content. Modelling the Story Detail slide-over as a nested child route — rather than a decoupled overlay — keeps the list context mounted behind it and makes the slide-over deep-linkable for free, satisfying the "direct visit opens the slide-over" requirement without duplicate state.

**Trade-offs**: The route tree is deeper and layout concerns are spread across three shell components, so a new engineer must understand the nesting to place a new route correctly. The `/` index becomes a redirect (`RootRedirect`) rather than a page, and the old `/projects/:id` Stories path is gone (replaced by `/projects/:id/stories`) — direct links to the old path resolve via the AppShell index redirect. Persisted UI state now spans several local-storage keys owned by different components. This is a hard-to-reverse restructuring of the frontend shell: reverting would require rewriting the routing and layout composition.
