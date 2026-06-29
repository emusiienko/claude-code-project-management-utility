# ADR-006: Frontend as a React SPA

**Date**: 2026-06-29
**Status**: Accepted
**Decision**: Build the web UI as a client-rendered React 18 single-page application (Vite), served as a static build by an nginx container, consuming the REST API. Screen-based folder decomposition with shared/core/api folders.
**Options Considered**:
- Server-rendered pages / SSR framework (e.g. Next.js)
- Client-rendered React SPA (chosen)
**Rationale**: The simplicity default favors server-rendered pages, but the UI requirements are interaction-heavy: Kanban drag-and-drop with optimistic updates, a deep-linkable full-screen task modal, collapsible panels persisted in local storage, and < 300 ms client navigation. These argue for a rich client. There is no SEO or first-paint-over-network concern (localhost, single user), so SSR adds complexity without benefit.
**Trade-offs**: A SPA ships more JavaScript and needs client-side data fetching/caching (TanStack Query). No server rendering means initial load depends on bundle size — bounded by the < 2 s local-load target. Backend and frontend types are not shared (see ADR-001); the API contract is the boundary.
