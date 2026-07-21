---
id: BUG-002
story: STORY-022
severity: major
status: wont-fix
assignee: frontend-developer
---

# BUG-002: Global Projects top-bar entry reported not visible on a cold load until `/projects` has been visited once

## Description
Reported symptom: the global "Projects" entry added to the top bar in TASK-001
(`frontend/src/app/TopBar.tsx`) is not visible on a cold load of the app —
specifically when landing directly on `/sessions` (Sessions mode) without
having navigated to `/projects` first. After visiting `/projects` once, the
entry becomes visible everywhere (Task Manager and Sessions modes), which
would be the correct behavior per the story's AC ("visible in the app's
persistent top bar, in both Task Manager mode and Sessions mode" —
unconditionally).

This would imply the entry's render is gated on some route-derived or
lazily-initialized state (a local-storage value, an unresolved query, a
mount-order/context issue) rather than being the unconditional render TASK-001
was supposed to produce.

## Steps to Reproduce (as reported)
1. Cold-load the app directly at `/sessions` (no prior visit to `/projects`
   in this browser session).
2. Observe the top bar's right-side region.
3. Reported: the "Projects" entry is absent.
4. Navigate to `/projects` once.
5. Reported: the "Projects" entry now appears, and stays visible afterwards
   in both modes.

## Investigation

**1. Source read — `frontend/src/app/TopBar.tsx`.** The Projects `NavLink` is
rendered unconditionally inside the top bar's right-side `<div>`; only the
"Config" (Settings) button is gated on `mode === "task-manager"`. There is no
conditional, no local-storage read, no query, and no lazy state anywhere in
the render path that could hide the Projects `NavLink` itself. `RootLayout.tsx`
(which mounts `<TopBar />` above the route `<Outlet />`) and `router.tsx`
confirm `TopBar` is not lazy-loaded and not wrapped in any `Suspense`/error
boundary that could unmount it while a route's own lazy chunk (e.g.
`SessionsPage`) is loading — `SuspendedPage` wraps only the leaf route
element, never `TopBar`.

**2. Automated reproduction attempt (component level).** Added a temporary
test that imports the real `router` module fresh with `window.location`
already at `/sessions`, `localStorage` cleared, and a brand-new
`QueryClient` (empty cache) — mounted via a real `createRoot` +
`React.StrictMode`, matching `main.tsx`'s actual bootstrap as closely as
possible in jsdom. The global Projects link was present immediately. Repeated
with a plain `RouterProvider` render (no StrictMode) — same result. (Test file
removed after use; not part of the permanent suite.)

**3. Live-browser reproduction attempt (production build).** The project's
running `aiacu-web:local` container (image built 2026-07-21T16:28 UTC — after
both the TASK-001 commit `0e035bf` and the BUG-001 fix commit `006f57f`, both
at ~16:11 UTC) was driven with a headless Chromium browser in a **brand-new,
isolated context** (no cookies, no localStorage, no cache — a true cold
start). Navigating directly to `http://localhost:3000/sessions` rendered the
Projects `<a href="/projects">` link in the top bar immediately, before any
navigation to `/projects` occurred. Navigating to `/projects` and back to
`/sessions` in the same context showed no change in the link's presence —
only its `aria-current`/active styling changed, as expected. Network logs for
this container show the top bar's markup ships inside the eagerly-loaded main
chunk (`index-*.js`), not a route-specific lazy chunk, confirming it cannot be
gated by a not-yet-fetched chunk for `/sessions`.

**4. Cross-check against independent QA investigation.** `manual-qa`'s own
STORY-022 QA Execute run (`docs/qa/results/STORY-022-2026-07-21.md`) recorded,
independently and prior to this investigation: *"User-reported symptom check
(Projects entry only appearing after visiting /projects once): tested cold
navigation directly to /sessions with localStorage/sessionStorage cleared —
Projects entry rendered immediately, no repro... Symptom did not reproduce in
this environment/session."* This matches the outcome above exactly, using a
separate test pass.

## Root Cause

No defect was found in `frontend/src/app/TopBar.tsx` or its ancestors
(`RootLayout.tsx`, `router.tsx`, `App.tsx`, `main.tsx`). The Projects entry's
render has no dependency — direct or indirect — on route history, mode, or any
local-storage/query state; it is unconditional exactly as TASK-001 intended,
and this was verified at three levels (source read, jsdom reproduction against
a true cold `/sessions` load, and a real headless-browser session against the
actual deployed container) plus a fourth, independent confirmation from
manual-qa's own test run.

The most plausible explanation for the original observation is a **stale
build or browser-cache artifact from before the running container was
rebuilt with the TASK-001 + BUG-001 changes** (the `aiacu-web:local` image
in this environment was rebuilt at 2026-07-21T16:28 UTC, strictly after both
fixes landed at ~16:11 UTC) — e.g. a browser tab left open against a
pre-rebuild page load, or a cached pre-rebuild `index.html`/bundle served
until a subsequent navigation happened to coincide with (or trigger) a fresh
asset fetch. This is a testing-environment artifact, not an application
defect, and is outside the frontend source's control.

## Fix

None applied — no reproducible defect exists in the current source or the
current deployed build. No code change was made.

**Recommendation**: re-verify with a hard-refreshed browser (or a fresh
private/incognito window) against the current `aiacu-web:local` container
before re-opening. If the symptom recurs against a confirmed up-to-date
container in a guaranteed-cold browser profile, please re-open with the exact
container image digest/build timestamp and browser cache state at the time of
observation so the discrepancy with this investigation can be reconciled.

## Additional Info
- Related, but distinct: manual-qa's tc-006 (mode-switch position stability)
  found that the Projects entry visibly shifts ~92px to the right when
  switching from Task Manager to Sessions mode, because the right-side flex
  region (anchored to the container's right edge via `justify-between`)
  shrinks when the Config button disappears in Sessions mode. That is a real,
  separate layout defect and is expected to be filed by manual-qa under its
  own bug ID — it is not the cause of this ticket's reported symptom (the
  entry was never actually absent in either investigation, only repositioned).
