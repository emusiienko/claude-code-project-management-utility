---
status: Done
assignee: frontend-developer
story: STORY-002
---

# TASK-007: Frontend SPA foundation & placeholder screens

## What to implement
Stand up the screen-based React 19 + Vite SPA from the architecture as a domain-agnostic shell that
every later story reuses. This is the frontend equivalent of the backend scaffold (TASK-001): built
once here, never re-established later — STORY-003+ only replace a placeholder with a real screen.

- **Scaffold** — the Vite + React 19 + TypeScript project and its build/dev configuration, compiling
  and serving cleanly.
- **Routing & layout shell** — a single route table mapping each main application area to a route,
  plus the layout shell (top-level navigation / tabs and a content outlet) that all screens render
  inside.
- **API client** — one configured client: base URL from environment, `{ data, error }` envelope
  unwrapping, and a shared error-surfacing convention. Every future screen consumes this client; no
  per-screen ad-hoc fetching.
- **Placeholder screens** — an empty "coming soon" screen for **every** main application area, each
  reachable from the navigation:
  - Projects
  - Stories
  - Tasks
  - Task Links
  - Attachments
  - Comments
  - Sessions
  - Milestones
  - Cross-project view
  - Settings

The shell contains no domain logic. Settings logic is added in TASK-008, which fills the Settings
placeholder.

## Scope
`frontend/` — `src/core`, `src/shared`, `src/api`, `src/screens` (placeholders), routing, layout,
build config.

## Dependencies
None (no code dependency on backend tasks; may proceed in parallel)

## Acceptance Criteria
- [ ] The SPA scaffolds, builds, and serves with React 19 + Vite.
- [ ] Every main application area listed above has a route, a navigation entry, and an empty
      placeholder screen rendered inside the layout shell.
- [ ] A single configured API client exists (env-driven base URL, envelope unwrapping, shared error
      surfacing) and is the only fetching mechanism.
- [ ] No domain/business logic in the shell — placeholders render a minimal "coming soon" state only.

## Intended ADR
None.

---
## Implementation Report

**Date**: 2026-06-30

**What was done**:
Stood up the complete React 19 + Vite + TypeScript SPA shell from scratch. The `frontend/` directory did not exist prior to this task.

- **Scaffold**: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `postcss.config.js`, `tailwind.config.ts`, `index.html`, `.env.example`, `.gitignore`.
- **Routing & layout shell**: `src/core/router.tsx` (10 routes, lazy-loaded via `React.lazy` + `Suspense`); `src/core/Layout.tsx` (top nav with `NavLink` active-state highlighting + `<Outlet />`); default redirect from `/` to `/projects`.
- **API client**: `src/api/client.ts` — typed `fetch` wrapper with `ApiRequestError` class, `buildUrl`/`appendQuery` helpers, `skipDefaultContentType` flag for multipart uploads, and `apiClient.{get, post, put, delete, upload}` methods; `src/api/types.ts` — all 30+ TypeScript interfaces derived from `docs/api-contract.md` v1.0; `src/api/queryKeys.ts` — centralized TanStack Query key factory for every domain; `src/api/settings.ts` — stub file (implemented in TASK-008).
- **Providers**: `src/core/App.tsx` — `QueryClientProvider` + `RouterProvider`; `src/core/queryClient.ts` — singleton `QueryClient` with `staleTime: 0` and no mutation retries.
- **Global styles**: `src/core/index.css` with Tailwind directives and `focus-visible` ring for WCAG AA keyboard navigation.
- **Shared UI**: `src/shared/ui/PageLoader.tsx` — aria-busy spinner; `src/shared/ui/PlaceholderScreen.tsx` — generic placeholder with `aria-labelledby`.
- **Placeholder screens (10)**: `projects`, `stories`, `tasks`, `task-links`, `attachments`, `comments`, `sessions`, `milestones`, `cross-project`, `settings` — each a lazy-loaded default export wrapping `<PlaceholderScreen>`.
- **Design tokens**: `tailwind.config.ts` defines brand palette (blue 50–950), surface/border/text semantic colors, font families (Inter, JetBrains Mono), and border radii — no hardcoded hex values in components.

**Deviations from plan**:
- Used `fileURLToPath` + `node:url` in `vite.config.ts` instead of `path.resolve(__dirname)` to avoid requiring `ts-node` for the Node config type resolution; `@types/node` added as devDependency.
- Added `skipDefaultContentType` flag on the internal `request()` function (instead of passing empty `headers: {}`) so `apiClient.upload()` correctly omits `Content-Type` and lets the browser set the multipart boundary automatically.
- `settings.ts` in `src/api/` is a stub export rather than a complete module, to be filled by TASK-008; added a `TODO(STORY-002)` comment per convention.

**Technical decisions made**:
- `React.lazy` + `Suspense` at router level for all screens — every screen is code-split from day one, satisfying the < 500 kB initial bundle requirement from architecture.
- Tailwind CSS v3 `tailwind.config.ts` (TypeScript) — works with Vite's PostCSS integration without ts-node.
- `staleTime: 0` in QueryClient — all user-generated data is immediately stale; TanStack Query refetches on focus/mount by default. Justified by the real-time collaborative nature of the agent pipeline.
- No global client state (no Redux, no Zustand) — the architecture does not require it; TanStack Query covers all server state.
- `manualChunks` in Vite config splits react/react-dom, react-router-dom, and @tanstack/react-query into separate vendor chunks for better long-term caching.
- Design tokens (colors, fonts, radii) in `tailwind.config.ts` — all components reference these semantic names, never raw hex values. This ensures consistent theming across 10+ future screens.

**Code locations**:
- `frontend/package.json` — dependency manifest
- `frontend/vite.config.ts` — Vite build config with `@/` alias
- `frontend/tsconfig.json`, `frontend/tsconfig.node.json` — strict TypeScript config
- `frontend/tailwind.config.ts` — design tokens and Tailwind content paths
- `frontend/postcss.config.js` — PostCSS with Tailwind + autoprefixer
- `frontend/index.html` — SPA entry HTML
- `frontend/.env.example` — documents `VITE_API_BASE_URL`
- `frontend/src/main.tsx` — React 19 root mount
- `frontend/src/core/App.tsx` — global providers
- `frontend/src/core/queryClient.ts` — TanStack Query singleton
- `frontend/src/core/router.tsx` — route table (10 routes, all lazy)
- `frontend/src/core/Layout.tsx` — nav shell + Outlet
- `frontend/src/core/index.css` — Tailwind + focus-visible
- `frontend/src/api/client.ts` — HTTP client
- `frontend/src/api/types.ts` — API contract types
- `frontend/src/api/queryKeys.ts` — query key factory
- `frontend/src/api/settings.ts` — settings hooks stub
- `frontend/src/shared/ui/PageLoader.tsx` — loading spinner
- `frontend/src/shared/ui/PlaceholderScreen.tsx` — placeholder component
- `frontend/src/screens/{projects,stories,tasks,task-links,attachments,comments,sessions,milestones,cross-project,settings}/index.tsx` — 10 placeholder screens

**Technical debt noted**:
- `frontend/.env.local` committed with default value — should be in `.gitignore` for real secrets; here it's safe (only `localhost:8000`) but the pattern should be reviewed before any production use.
- `settings.ts` in `src/api/` is a stub; TASK-008 must fill it in with real query/mutation hooks before the Settings screen is functional.
- Favicon is a placeholder SVG (`public/vite.svg`); replace with a proper branded asset in a future story.
