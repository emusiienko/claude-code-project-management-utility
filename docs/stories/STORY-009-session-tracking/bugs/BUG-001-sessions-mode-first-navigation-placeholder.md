---
id: BUG-001
story: STORY-009
severity: major
status: open
assignee: frontend-developer
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
