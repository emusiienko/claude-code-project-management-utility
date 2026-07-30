---
id: BUG-001
story: STORY-009
severity: major
status: wont-fix
assignee: devops
---

# BUG-001: Switching to Sessions mode intermittently shows the stale "coming soon" placeholder instead of the real feature

## Description
TC-001 (`tc-001-sessions-mode-navigation`) covers switching from Task Manager to Sessions mode via
the top-bar "App mode" combobox. On the very first switch to Sessions mode in a browser
session, the app sometimes renders the old pre-STORY-009 placeholder screen ("🚧 Sessions —
Track agent face-to-face sessions and their decisions. Full implementation coming in
STORY-009.") instead of the real Sessions list, and the URL stays at the bare `/sessions` path
(it never redirects to `/sessions/:projectId`).

Repeating the exact same action (switching mode again, or navigating directly to `/sessions`)
consistently works correctly afterwards in the same tab — this points to a one-time race
condition on the first load of the Sessions route (most likely the lazy-loaded route chunk for
the real Sessions feature not being ready yet, with the router falling back to old/dead
placeholder code instead of a loading state).

Observed reproduction rate in this run: 1 failure in 5 attempts, always on the first switch
after a fresh page load; all subsequent switches within the same tab succeeded.

## Steps to Reproduce
1. Do a hard reload of the app at `http://localhost:3000/projects/<any-project>/stories` (fresh
   tab / first visit to Sessions mode in this tab).
2. Use the "App mode" combobox in the top bar to select "Sessions".
3. Observe the main content area.

## Expected Result
The app navigates to Sessions mode and either shows a brief loading state or immediately
redirects to `/sessions/:lastVisitedOrFirstProjectId`, rendering the real Sessions list for that
project.

## Actual Result
The URL remains at the bare `/sessions` path and the main content area renders the pre-STORY-009
placeholder screen ("🚧 ... Full implementation coming in STORY-009"), with no further
redirect happening. A second, independent switch to Sessions mode (or a direct navigation to
`/sessions`) works correctly and shows the real feature.

## Additional Info
- Confirmed via Playwright automation, not user-report speculation: the failing snapshot showed
  `Page URL: http://localhost:3000/sessions` with the placeholder text still present; three
  subsequent identical actions (fresh page load + combobox switch) all redirected correctly to
  `/sessions/<projectId>` and rendered the live Sessions list.
- No console errors were logged during the failing attempt (checked via
  `browser_console_messages`).
- Network inspection showed a `SessionsPage-*.js` chunk (old placeholder component, no longer
  present in the current build's asset directory) being served from the browser's disk cache on
  the failing attempt; once the real `SessionListPage-*.js` / `SessionDetailPage-*.js` chunks are
  fetched (cached), subsequent switches never show the placeholder again in that tab. This
  strongly suggests the bare `/sessions` route still has old/dead placeholder code reachable as a
  fallback while the real feature's route chunk loads, instead of showing a neutral loading state.

## Investigation Note (frontend-developer, 2026-07-30)

**Domain check result: reassigned to devops — root cause is not in frontend application code.**

Verified in the current frontend source (`frontend/src/app/router.tsx`,
`frontend/src/app/SessionsShell.tsx`, `frontend/src/app/SessionsIndexRedirect.tsx`,
`frontend/src/app/SessionsProjectGate.tsx`) and in the current build output
(`frontend/dist/`):

- `SessionsPage.tsx` (the pre-STORY-009 placeholder) was already deleted in TASK-006
  (see `docs/stories/STORY-009-session-tracking/tasks/TASK-006-sessions-screens.md`). There is no
  remaining code path, dead import, or lazy-loaded chunk in the current source that can render it —
  a repo-wide search for `SessionsPage` and for the placeholder's "coming soon" copy turns up only
  historical references in docs/CLAUDE.md and this bug report itself.
- The route tree the bug describes (bare `/sessions` rendering a placeholder with no
  `SessionsShell`/`SessionsIndexRedirect`/`SessionsProjectGate` nesting) matches the **pre-TASK-006**
  router shape, not the current one. The current `/sessions` index route is eagerly imported
  (`SessionsIndexRedirect`, no `Suspense`/chunk needed to decide the redirect) and the two Sessions
  screens that *are* lazy-loaded (`SessionListPage`, `SessionDetailPage`) are wrapped in
  `<Suspense fallback={<PageLoader />}>` — a chunk still loading would show the accessible spinner,
  never old component code, since that code no longer exists to be rendered.
- The bug's own evidence — a `SessionsPage-*.js` chunk "no longer present in the current build's
  asset directory" being served **from the browser's disk cache** — points to a stale asset from a
  *previous* deployment of this same origin (`localhost:3000`), not a defect in the app's current
  render logic. That is only possible if the browser also served a stale, cached copy of
  `index.html` from that earlier deployment (index.html is the only place asset hashes are named;
  a fresh `index.html` would never reference a chunk hash that isn't in the current `dist/assets/`).
- `frontend/nginx.conf` (IaC, devops-owned per `CLAUDE.md`) sets `Cache-Control: public, immutable`
  with a 1-year `expires` on `/assets/` (correct for content-hashed files) but sets **no explicit
  `Cache-Control` on `index.html`** served by the `location /` block. Without an explicit no-cache/
  revalidate directive, `index.html` is eligible for browser heuristic caching, so a client that
  cached an old `index.html` (referencing old, hash-named script tags) can pair it with those same
  chunk files still sitting in its long-lived immutable asset cache — reproducing exactly this
  "old placeholder flashes once, then never again" pattern with no console error and no fetch
  actually contacting the server for either file.
- This is a static-asset cache-header configuration issue in `frontend/nginx.conf`, which is an IaC
  file owned by devops (`CLAUDE.md` → Infrastructure → IaC files; also excluded from
  frontend-developer's domain per role scope). Reassigning `assignee` to `devops`; leaving
  `status: open`. Suggested direction for devops (not applied here): send
  `Cache-Control: no-cache` (or `no-store`) on `index.html` in the `location /` block so every
  navigation/reload always revalidates the entry document against the current deployment, while
  `/assets/` keeps its long-lived immutable caching.

## Closing Note (manual-qa, 2026-07-30)

User attempted to reproduce this bug and could not — the intermittent placeholder no longer
appears on first Sessions-mode navigation in a fresh tab across their attempts. Per user
request, closing as `wont-fix` rather than leaving open against devops. The frontend-developer's
investigation note above is left intact in case this resurfaces (likely candidate root cause:
missing no-cache directive on `index.html` in `frontend/nginx.conf`).
