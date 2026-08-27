# coder (frontend) — References

Setup completed under STORY-001 / TASK-010 (2026-08-27, SESSION-007). This instance is scoped to the
**frontend** stack only (React 19 · Vite · React Router · TanStack Query · Tailwind CSS · dnd-kit ·
react-markdown); the backend Python stack is a separate coder instance (`../backend/`, TASK-004).

## Artifacts I read (not owned)

Coding Conventions, Implementation Plan, Technical Documentation (incl. the **LOCKED** API Contract),
and frontend Repo-level ADRs — all resolved from `fast-sdlc-project-setup.md` § Artifacts, never
hardcoded here. Coding Conventions is re-read before marking any Task `Done` and is never edited by
coder, even at the user's request — redirect that request to lead-developer.

## Testing & Verification (frontend)

- Test runner: **Vitest** + React Testing Library (jsdom environment), run from `frontend/`.
- Full suite: `cd frontend && npx vitest run`
- Watch mode (local iteration only, never as the verification step): `npx vitest`
- Coverage: `npx vitest run --coverage`
- Type check: `cd frontend && npm run typecheck` (`tsc --noEmit`) — run when types are uncertain,
  same as the full `build` script does before `vite build`.
- Run the **baseline** before touching code and the **post-implementation** run after — any test
  passing in the baseline and failing after is a regression to fix before marking the Task `Done`;
  pre-existing failures go in the Implementation Report only.
- Never use a one-off inline snippet as verification — the Vitest suite (and `tsc --noEmit` for
  types) is the only accepted method.

### Convention Gap — test ownership (resolved by user decision, SESSION-007)

The Coding Conventions' § "Testing Guidance" is headed *"for QA — do not write tests yourself"*,
assigning test-writing to `qa-automation` rather than the implementer. This is a holdover from the
prior (pre-`fast-sdlc`) process, where a single `frontend-developer` role both implemented and wrote
tests (see `docs/qa-automation-strategy.md`'s Run Commands/Bug Assignment section, and the large
existing `*.test.tsx`/`*.test.ts` suite already in the tree) and `qa-automation` had not yet run its
own Setup at the time this note was written.

**Resolved, explicit, user-directed decision (SESSION-007):** as coder (frontend), I write tests
myself, **test-first (TDD)** — a failing test before the implementation that makes it pass — for
every Task, Quick Fix, and Bug Fix on this stack. This supersedes the "for QA" wording above; it does
not change any other line of the Coding Conventions. Flag this again to lead-developer if the
Coding Conventions are ever revised to state a different test-ownership model explicitly.

## Standards I follow (not restated in Coding Conventions)

- Layer order is fixed and never skipped: feature page → component → hook → endpoint function → HTTP
  client. A Task that seems to need a shortcut across layers is a signal to re-read the Task, not to
  bypass the layer.
- `shared/` never imports from `features/`; a component used by more than one feature is promoted to
  `shared/components/`, never imported cross-feature directly.
- Cache keys (`CACHE_KEYS`), pagination limits (`PAGINATION`), and stale times (`DATA_FRESHNESS`) are
  each defined exactly once in `src/config/` — a Task that needs a new one adds it there, never
  inline in a hook or component.
- API response/request shapes come from `src/api/types.ts`, derived from the LOCKED API Contract —
  never redeclare a shape inline; a Task that seems to need a contract change is a signal to escalate
  to architect, not to freelance a new field.
- A decision that crosses repo boundaries (API contract shape, cross-service behavior, DB/backend
  contract) is not mine to make — raise it to architect via the escalation mechanism
  (`.fast-sdlc/escalations/`); a decision that's frontend-local but reusable is a candidate for
  lead-developer's repo-level ADR (`frontend/adr-log/`), not something I create myself.
- If a Task's premise doesn't match what's actually in the code, stop and raise it to
  lead-developer — never guess or silently reinterpret the Task.

## Notes carried from the codebase (relevant when implementing frontend tasks)

- **No auth by design** — `*_role` fields are descriptive metadata, never access control; never add
  login/roles/RBAC/theme toggles for a permissions model that doesn't exist.
- **Top-level nav is exactly 3 items** (Projects `/`, Sessions `/sessions`, Settings `/settings` —
  Projects and Settings are now overlay triggers, not routes, per STORY-022 Revision 3). All other
  domains are sub-views under their parent context — never add a new top-level nav entry.
- **No dark mode** — out of scope; never introduce `dark:` Tailwind variants or a theme toggle.
- **No global client state store** (no Redux/Zustand) — server state lives in TanStack Query, local
  UI state in `useState`/`useLocalStorage`; never add a new state-management library.
- **Icon buttons go through the shared `IconButton` primitive** (`src/shared/components/IconButton.tsx`)
  with both `aria-label` and `title` — never style an icon button inline in a feature.
- **Clear-override is a known end-to-end gap** (STORY-002) — the frontend calls a REST route that
  doesn't exist yet; don't silently "fix" this inside an unrelated Task without checking whether it's
  that Task's actual scope.
