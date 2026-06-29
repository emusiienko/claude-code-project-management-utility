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

---

## Comments

- Do not explain WHAT the code does — well-named identifiers do that
- Only add a comment when the WHY is non-obvious: a hidden constraint, a workaround, a subtle invariant
- No commented-out code in commits
- No TODO without a linked story ID (e.g. `// TODO(STORY-004): handle empty state`)

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
- Layer order: screen → component → hook → API layer. Never skip a layer
- Screen folders contain only page-level orchestration — no business logic in screens

---

## File & Folder Naming

- Components: PascalCase (`StoryCard.tsx`, `TaskDetailModal.tsx`)
- Hooks: camelCase with `use` prefix (`useStories.ts`, `useTaskDetail.ts`)
- Utilities: camelCase (`formatDate.ts`, `buildQueryKey.ts`)
- Folders: kebab-case (`story-detail/`, `shared/task-card/`)
- Screen entry files: `index.tsx` inside a kebab-case screen folder (`screens/story-detail/index.tsx`)

---

## TypeScript

- Strict mode enabled
- Explicit prop types for all components — no `any`
- Prefer `interface` for component props and API shapes; `type` for unions and derived types
- API response types imported from `src/api/` — never redeclare inline in components
- `satisfies` operator preferred over `as` for type narrowing when possible

---

## Components

- Pure functional components only — no class components
- One component per file
- Extract logic to custom hooks — keep components declarative
- No direct DOM manipulation — use refs only when unavoidable (focus management, dnd-kit integration)
- Props drilling > 2 levels deep: extract to context or co-locate with a dedicated hook
- No business logic in JSX — all conditionals and transforms in hooks or helpers
- Screen-level (`screens/`) and shared (`shared/`) components are the only two visibility levels — no other coupling

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

- Query keys are centralized in `src/api/queryKeys.ts` — never define keys inline
- Every domain has one file in `src/api/` with typed query and mutation hooks (e.g. `src/api/stories.ts`)
- `queryClient.invalidateQueries` is called only from mutation hooks, never from components
- Stale times: default (0) for user-generated data; increase only when explicitly justified
- Mutations that modify a list invalidate the parent list key; mutations that modify a detail invalidate the detail key

---

## API Layer

- All HTTP calls go through `src/api/client.ts` — a typed wrapper around `fetch`
- Every endpoint maps to exactly one hook in `src/api/<domain>.ts`
- Request/response shapes are TypeScript interfaces generated from `docs/api-contract.md` — never infer inline
- Never call `fetch` directly from components or screens
- Error responses are parsed into the standard `ApiError` shape at `src/api/client.ts` and re-thrown; mutation hooks catch and surface them in `onError`

---

## Routing (React Router)

- Route definitions live in `src/core/router.tsx`
- Each screen gets one route; modal deep-linking uses nested routes or search params (`?taskId=xxx`)
- No `useNavigate` or `useLocation` inside shared components — pass callbacks as props or use screen-level wrappers
- Lazy-load screens with `React.lazy` + `Suspense` at the router level — all screens are code-split

---

## Styling (Tailwind CSS)

- Tailwind utility classes only — no custom CSS files unless unavoidable
- No inline `style` props unless computing dynamic values that cannot be expressed as Tailwind classes
- No `!important` — redesign the structure instead
- Design tokens (colors, spacing, radii) come from `tailwind.config.ts` — never hardcode hex values or pixel values
- Class ordering: layout → sizing → spacing → typography → color → interactivity — follow Prettier Tailwind plugin order
- Variants for hover/focus/active/disabled states are preferred over separate state-driven class conditionals

---

## Accessibility

- Semantic HTML: `<button>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<dialog>` used appropriately — no `<div onClick>` for interactive elements
- All interactive elements are keyboard-accessible (Tab, Enter, Space, Escape for modals)
- Images must have `alt` text; decorative images use `alt=""`
- WCAG 2.1 AA minimum — minimum contrast ratios enforced via Tailwind token choices
- `aria-label` or `aria-labelledby` on icon-only buttons
- Drag-and-drop (dnd-kit): all drag operations must have a keyboard-accessible alternative

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

- `src/` aliases configured in `vite.config.ts` — use `@/` prefix for absolute imports (`import { Button } from '@/shared/ui/Button'`)
- Environment variables via `import.meta.env.VITE_*` — never use `process.env` in frontend code
- All third-party libraries that break in SSR (N/A for this SPA) are noted for awareness
- Bundle size: keep the initial chunk < 500 kB gzipped — check after adding new dependencies

---

## Performance

- Lazy-load all screen components at the router level (`React.lazy`)
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
