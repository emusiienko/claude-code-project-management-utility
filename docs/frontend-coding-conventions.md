# Frontend Coding Conventions

> Owned by **frontend-developer**. Update only at the user's explicit request.
> Stack: React 19 · Vite · React Router · TanStack Query · Tailwind CSS · dnd-kit · react-markdown

---

## Git

- Branch naming: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`
- Commit format: Conventional Commits — `type(scope): short description`
  - Types: feat, fix, chore, refactor, docs, test
- No direct commits to main/develop — PRs only
- No `--no-verify`, no force-push to main
- No "Co-worked with Claude" or similar endings

---

## Comments

- Do not explain WHAT the code does — well-named identifiers do that
- Only add a comment when the WHY is non-obvious: a hidden constraint, a workaround, a subtle invariant
- No commented-out code in commits
- No TODO without a linked story ID (e.g. `// TODO(STORY-004): handle empty state`)
- Comments must not be verbose, only the code which is not understandable without comments should be commented

---

## Documentation Coverage

- Every exported component and hook must have a JSDoc describing its purpose and props
- Internal helpers with non-obvious behaviour: one-line comment on the why
- No multi-paragraph docstrings — if it needs that much, the interface is wrong

---

## Error Handling

- Never swallow errors silently
- Translate network/API errors into user-readable messages at the boundary (inside query/mutation hooks)
- User-facing error messages must never expose internals (stack traces, raw API responses)
- Every component that fetches data must handle loading, error, and empty states explicitly
- TanStack Query `onError` callbacks are the error boundary for mutations — no raw try/catch in components

---

## Code Organisation

- One component or hook per file — do not bundle unrelated responsibilities
- No circular dependencies between modules
- Layer order: feature page → component → hook → endpoint function → HTTP client. Never skip a layer
- Feature page files (`*Page.tsx`) contain only page-level orchestration — no business logic, no direct API calls

### Source folder structure

- `src/app/` — application root: `App.tsx`, `Layout.tsx`, `router.tsx`, `queryClient.ts`, global styles
- `src/core/` — shared infrastructure: HTTP client (`client.ts`), low-level utilities with no domain knowledge
- `src/api/` — API layer
  - `types.ts` — all TypeScript interfaces derived from the API contract; no domain logic
  - `paths.ts` — all URL strings as `API_PATHS` constants; no other exports
  - `endpoints/<domain>.ts` — plain async functions per domain; one file per domain
- `src/config/` — app-wide configuration constants
  - `apiConfig.ts` — `PAGINATION` page sizes and `DATA_FRESHNESS` stale times
  - `cacheConfig.ts` — `CACHE_KEYS` registry for all domains
- `src/features/<domain>/` — one folder per product feature
  - `<Name>Page.tsx` — feature entry point; registered in the router
  - `components/` — components used only within this feature
  - `hooks/` — TanStack Query hooks for this feature
  - `utils/` — pure helpers with no side effects
- `src/shared/` — cross-feature code; nothing here imports from `features/`
  - `components/` — reusable UI components
  - `hooks/` — hooks used by more than one feature
  - `utils/` — shared pure utilities

---

## File & Folder Naming

- Components: PascalCase (`StoryCard.tsx`, `TaskDetailModal.tsx`)
- Hooks: camelCase with `use` prefix (`useStories.ts`, `useTaskDetail.ts`)
- Utilities: camelCase (`formatDate.ts`, `buildQueryKey.ts`)
- Folders: kebab-case (`story-detail/`, `shared/task-card/`)
- Feature entry: PascalCase `{Name}Page.tsx` at the root of its feature folder (`features/settings/SettingsPage.tsx`)
- Feature sub-folders: `components/`, `hooks/`, `utils/` — lowercase; no index barrel files
- Cross-feature shared hooks: `shared/hooks/use{Name}.ts`

---

## TypeScript

- Strict mode enabled
- Explicit prop types for all components — no `any`
- Prefer `interface` for component props and API shapes; `type` for unions and derived types
- API response types imported from `src/api/types.ts` — never redeclare inline in components
- `satisfies` operator preferred over `as` for type narrowing when possible

### API type naming convention

Types in `src/api/types.ts` use the domain object name only — no `Response` or `Body` suffixes:

- Output types (returned by endpoints): named after the entity — `Project`, `Story`, `Task`
- Input types (sent to endpoints): verb prefix only — `CreateProject`, `UpdateProject`, `CreateStory`
- Aggregate / detail types: descriptive name — `StoryDetail`, `TaskDetail`, `MilestoneDetail`

Do not add `Response`, `Body`, `Payload`, `Dto`, or similar suffixes to any API type.

---

## Components

- Pure functional components only — no class components
- One component per file
- Extract logic to custom hooks — keep components declarative
- No direct DOM manipulation — use refs only when unavoidable (focus management, dnd-kit integration)
- Props drilling > 2 levels deep: extract to context or co-locate with a dedicated hook
- No business logic in JSX — all conditionals and transforms in hooks or helpers
- Feature-level (`features/<domain>/components/`) and shared (`shared/components/`) are the only two visibility levels — a component in one feature must never be imported by another feature; extract to `shared/` instead

---

## State Management

- **Server state**: TanStack Query — all API data lives here; never duplicate in local state
- **Local UI state**: `useState` for component-scoped state (open/closed, hover, selected item)
- **Persisted UI state**: `localStorage` for state that survives page reload (e.g. story-detail panel open/closed per story) — wrap in a `useLocalStorage` hook, never access `localStorage` directly from components
- **No global client state store** (no Redux, no Zustand) — the architecture does not require it
- Never store derived data — compute from TanStack Query cache
- Optimistic updates use TanStack Query's `onMutate` / `onError` rollback pattern

---

## TanStack Query Conventions

- Cache keys are centralized in `src/config/cacheConfig.ts` as `CACHE_KEYS` — never define keys inline in hooks
- Hooks live in `features/<domain>/hooks/` (feature-specific) or `shared/hooks/` (cross-feature); one hook per file
- Hooks are thin wrappers: reference a `CACHE_KEYS` key, call the endpoint function, handle invalidation on mutation
- Stale times come from `DATA_FRESHNESS` in `src/config/apiConfig.ts` — never hardcode millisecond values inline
- `queryClient.invalidateQueries` is called only from mutation hooks, never from components
- Mutations that modify a list invalidate the parent list key; detail mutations invalidate the detail key

---

## API Layer

Three layers: `src/core/client.ts` (HTTP wrapper) → `src/api/endpoints/<domain>.ts` (plain async functions) → `features/*/hooks/` or `shared/hooks/` (TanStack Query hooks). Never collapse or skip layers.

- Each endpoint function is plain `async` — no TanStack Query inside endpoint files
- Each endpoint function maps 1:1 to one API operation and unwraps the `{ data: T }` envelope before returning
- URL strings live in `src/api/paths.ts` (`API_PATHS`) — never inline URL strings in endpoint functions
- Pagination limits live in `src/config/apiConfig.ts` (`PAGINATION`) — never hardcode page sizes
- TypeScript interfaces are imported from `src/api/types.ts` — never redeclare inline
- `ApiRequestError` is the standard error class for network failures — caught in mutation `onError` callbacks

---

## Routing (React Router)

- Route definitions live in `src/app/router.tsx`
- Each screen gets one route; modal deep-linking uses nested routes or search params (`?taskId=xxx`)
- No `useNavigate` or `useLocation` inside shared components — pass callbacks as props or use screen-level wrappers
- Lazy-load all feature page components with `React.lazy` + `Suspense` at the router level — all pages are code-split

---

## Styling (Tailwind CSS)

- Tailwind utility classes only — no custom CSS files unless unavoidable
- No inline `style` props unless computing dynamic values that cannot be expressed as Tailwind classes
- No `!important` — redesign the structure instead
- Design tokens (colors, spacing, radii) come from `tailwind.config.ts` — never hardcode hex values or pixel values
- Class ordering: layout → sizing → spacing → typography → color → interactivity — follow Prettier Tailwind plugin order
- Variants for hover/focus/active/disabled states are preferred over separate state-driven class conditionals
- **No dark mode** — dark mode is out of scope for this project. Do not use `dark:` Tailwind variants, do not add a theme toggle, and do not define CSS variables for a dark theme

---

## Accessibility

- Semantic HTML: `<button>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<dialog>` used appropriately — no `<div onClick>` for interactive elements
- All interactive elements are keyboard-accessible (Tab, Enter, Space, Escape for modals)
- Images must have `alt` text; decorative images use `alt=""`
- WCAG 2.1 AA minimum — minimum contrast ratios enforced via Tailwind token choices
- `aria-label` or `aria-labelledby` on icon-only buttons
- Drag-and-drop (dnd-kit): all drag operations must have a keyboard-accessible alternative

---

## Icons & Icon Buttons

### Icon library

- **Lucide React is the sole icon library** for this project. No other icon library may be introduced.
- Import icons individually by name — never import the full icon set (`import { Pencil, Trash2 } from 'lucide-react'`). Named imports are required so tree-shaking keeps the initial chunk under budget.

### When to use icon buttons vs. text buttons

Two distinct button categories exist in the UI; mixing them is not permitted:

- **Icon buttons** — used for item/row-level management actions such as Edit, Delete, Clear override, and per-value remove. These must use the shared `IconButton` primitive in `src/shared/components/IconButton.tsx` — never style an icon button inline inside a feature component.
- **Text buttons** — used for form-level and primary CTA actions such as "New project", "Add", "Save", and "Cancel". These remain labeled text buttons and are outside the icon-button mandate.

### Shared IconButton primitive

All item/row-level icon buttons must go through `src/shared/components/IconButton.tsx`. This component owns the common visual contract (size, spacing, intent variants, hover/focus/disabled states). Creating a custom icon button inline in a feature is a convention violation — extract to the shared primitive instead.

### Accessibility for icon-only buttons

Icon-only buttons carry no visible text label. Both of the following are required on every `IconButton` instance:

- `aria-label` — an accessible name describing the action and its target (e.g. `"Edit Project Alpha"`, `"Delete Alpha"`, `"Remove value from label"`).
- `title` — the same string as `aria-label`, surfacing a native browser tooltip on hover. No third-party tooltip library is needed or permitted for this purpose.

---

## Drag and Drop (dnd-kit)

- Use `@dnd-kit/core` + `@dnd-kit/sortable` only — no other DnD library
- Keyboard accessibility: every sortable item must support `KeyboardSensor`
- Optimistic update on drop — roll back via TanStack Query `onError` if the `PUT /tasks/:id` call fails
- Drag logic lives in a hook (`useBoardDrag.ts` or similar) — no DnD wiring in screen JSX directly

---

## Markdown Rendering

- Use `react-markdown` for all Markdown content — no custom parsers
- Sanitize output — pass only trusted content; never render raw user HTML
- Code blocks use syntax highlighting if the architecture calls for it — document the decision in the implementation report

---

## Vite / Build

- `src/` aliases configured in `vite.config.ts` — use `@/` prefix for absolute imports (`import { Button } from '@/shared/components/Button'`)
- Environment variables via `import.meta.env.VITE_*` — never use `process.env` in frontend code
- All third-party libraries that break in SSR (N/A for this SPA) are noted for awareness
- Bundle size: keep the initial chunk < 500 kB gzipped — check after adding new dependencies

---

## Performance

- Lazy-load all feature page components at the router level (`React.lazy`)
- Memoize with `React.memo`, `useMemo`, `useCallback` **only when a profiler confirms a bottleneck** — do not pre-optimize
- Lists of ≥ 100 items use virtualization (e.g. TanStack Virtual) — document the threshold in the implementation report when first applied
- Client navigation target: < 300 ms (requirement from architecture.md) — rely on TanStack Query cache to avoid re-fetch on back-navigation

---

## Testing Guidance (for QA — do not write tests yourself)

Each component must be trivially testable without reading internals:

- Components accept all external state as props — no hidden context reads that are not documented
- Hooks expose their return values as plain objects — no opaque closures
- Error states and loading states render distinct, queryable UI (e.g. `role="alert"`, `aria-busy`)
- Avoid logic in JSX that isn't expressed elsewhere — keep rendering deterministic given props
