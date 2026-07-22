# STORY-022 — Check Story Execute re-run #3 — 2026-07-22 (Revision 3: state-driven overlay, TASK-009/010/011)

## Environment
- Web image rebuilt 2026-07-22 14:51:53 CEST — confirmed newer than the latest frontend commit (`da8a538`, panel-width tweak, 14:50:06 CEST). Image is current, no rebuild requested this pass.
- App reachable at http://localhost:3000, backend at http://localhost:8000.
- Tested with Chromium via Playwright MCP, ambient viewport ~1512px. No viewport-resize tool available this session — full 375/767/768px breakpoint sweep in tc-012 not exhaustively re-run (same limitation as prior passes); desktop spot check passed, panel width confirmed exactly 70.0% of viewport width.

## Scope of this pass (per orchestrator request)
Re-verify against the full Revision 3 model, which replaces all routing-based Projects/Config navigation from Revisions 1–2 with a state-driven slide-over overlay:
1. Overlay open/close via top-bar triggers (now `<button>`s, not links/`NavLink`s)
2. Back vs Dismiss distinction
3. Projects list → Settings panel navigation (internal stack push, no route change)
4. The "Open in Task Manager" bridge (re-verify BUG-006 resolution)
5. Main view staying mounted/unaffected underneath
6. Cold-start auto-open behavior
7. The new ~70vw panel width

Test cases were rewritten (`docs/stories/STORY-022-global-project-navigation/test-cases.md` and all `test-cases/tc-*.md` files) to match this model — the prior routing-based TC files (route navigation, URL assertions, "Close"/"Back" full-page buttons) no longer matched reality after Revision 3 removed `/projects`, `/settings`, and `/projects/:id/settings` as routes entirely.

## Results

### Overlay open/close via top-bar triggers — PASS
- Both "Projects" and "Config" are `<button>` triggers (confirmed via DOM query), not routed links.
- Clicking either opens a right-side slide-over panel over the current main view without changing the URL (confirmed: URL stayed on the pre-click Task-Manager/Sessions route throughout).
- Each trigger shows `aria-current="page"` + active styling exactly while its own overlay is open, at any stack depth, confirmed via direct attribute/className inspection (the Playwright accessibility-snapshot tool's inline `[active]` annotation was occasionally stale/lagging one render behind — cross-checked with `getAttribute('aria-current')` every time before treating it as a finding).

### Back vs Dismiss — PASS
- Projects (2-level stack): no "Back" at the root project list; selecting a project pushes the Settings level and "Back" appears; clicking "Back" returns to the list (overlay stays open); clicking "Dismiss" from the Settings level closes the whole stack in one action.
- Config (1-level stack): "Back" never appears at any point — only "Dismiss".
- Backdrop click (outside the panel) also fully closes the overlay from any depth, confirmed via direct `.click()` on the backdrop element.
- Escape closes exactly one level per press: confirmed via `document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', ...}))` while a Story slide-over + Task Detail modal + Projects overlay were all open simultaneously — one Escape press closed only the topmost-registered (most recently opened) overlay, leaving the two views beneath untouched. (Escape's registration-order stack logic is correct; see BUG-007 below for a separate, purely-visual finding in this same stacked scenario.)

### Projects list → Settings panel — PASS
- Selecting a project in the list is a `<button onClick>`, not a route `Link` — confirmed the URL never changes when pushing to the Settings level.
- Settings panel shows the project name, dictionary editor (with "Override" badges where applicable, confirmed on "Test Project Alpha" which does have per-project overrides), and no sub-navigation tab bar — matches the design intent from TASK-004/009/010 (single forward action, not a tab bar).

### "Open in Task Manager" bridge (BUG-006 re-verification) — PASS, resolved
- From a Task-Manager view: selected "Project Beta" (a project not opened this session) in the Projects overlay → Settings panel → clicked "Open in Task Manager" → landed on Project Beta's Stories view with the overlay dismissed and the three-tab sub-nav present.
- From Sessions mode: selected "Test Project Alpha" (not opened this session) → Settings panel → clicked "Open in Task Manager" → landed on Test Project Alpha's Stories view, overlay dismissed, sub-nav present, app-switcher correctly flipped from "Sessions" to "Task Manager".
- No sub-navigation tab bar was added to the Settings panel itself — the resolution is the single forward button, consistent with TASK-010's constraint.
- BUG-006's status remains `resolved` (re-confirmed against the new overlay model, not just the prior standalone-screen fix which TASK-009 superseded/removed entirely).

### Main view mounted/unaffected underneath — PASS
- Confirmed via DOM inspection that the Stories page content (table, filters, sidebar) remains present in the DOM simultaneously with the Projects/Config dialog — the main view is never unmounted, only visually dimmed behind a backdrop.
- Dismissing the overlay from Sessions mode restored the exact same Sessions placeholder view with no reload/flash.
- App-switcher mode derivation is purely route-based now (Revision 3 removed the closable-view/main-view classification and last-main-view recording entirely, per TASK-009's report) — confirmed the switcher tracked the underlying route correctly throughout all overlay open/close/back sequences in both modes.

### Cold-start auto-open — verified by code reading only (not exercised destructively)
`RootRedirect.tsx`'s `RootRedirectFetch` component was read directly: when the fetched project list is empty, it calls `openProjects()` once (guarded by a `useRef` flag so it doesn't reopen on every background refetch) and renders an inline "No projects yet" main view rather than redirecting anywhere. This was not exercised end-to-end against the shared local dev environment (would require deleting all 4 real seeded projects), consistent with the same judgment made in the two prior QA passes over this story (tc-008 in both `STORY-022-2026-07-21.md` and `STORY-022-2026-07-21-rerun2.md`). Recommend exercising this in a disposable environment before final acceptance if end-to-end confidence is required beyond code-reading.

### Panel width (~70vw) — PASS
Measured via `getBoundingClientRect()` on both the Projects and Config `role="dialog"` panels: width 1058.4px against a 1512px viewport = exactly 70.0%, matching TASK-009's addendum (`w-[70vw]`).

## New failure found

**BUG-007** (new, `open`, `major`, assignee `frontend-developer`): the Projects/Config overlay (`OverlayHost`, backdrop `z-40` / panel `z-50`) renders correctly on top of an open Story slide-over alone (`z-50` — same level, later in DOM order), but is rendered **completely hidden behind** an already-open Task Detail modal (`z-[70]`), since `z-50 < z-[70]`. The overlay does open (confirmed via DOM inspection — a `role="dialog"` element with the right `aria-label` and content mounts), but nothing changes visibly on screen beyond the top-bar trigger's active-state styling — the user gets no indication anything happened, and cannot see or interact with the panel until manually closing the Task Detail modal first. Reproduces identically for both "Projects" and "Config". Escape's own stack ordering is unaffected (it still correctly closes the invisible overlay first) — this is purely a visual/z-index defect. See `docs/stories/STORY-022-global-project-navigation/bugs/BUG-007-overlay-hidden-behind-open-task-detail-modal.md` for full repro steps and screenshots.

## Outcome (initial)
QA ✓ **withheld** pending BUG-007 resolution. BUG-006 is independently re-confirmed `resolved` against the new overlay model. All prior bugs (BUG-001 through BUG-006) remain in their previously-recorded final states (`resolved`/`wont-fix`) — no new regressions found in those areas. Story test cases (`docs/stories/STORY-022-global-project-navigation/test-cases.md` and all 15 `tc-*.md` files) were rewritten this pass to match Revision 3's actual behavior; the prior routing-based versions are superseded.

---

## BUG-007 re-verification — 2026-07-22 (same day, following the fix rebuild)

Web image rebuilt 2026-07-22 15:35:43 CEST, confirmed newer than the fix commit `c4f8fff` (15:30:36 CEST, "overlay z-index below Task Detail modal — raised to z-[95]/z-[99]").

Re-ran the exact BUG-007 repro: opened a Story slide-over, then a Task Detail modal on top of it, then clicked the global "Projects" entry. `getComputedStyle(dialog).zIndex` now reads `test-2` (slide-over) `50`, `task-1` (Task Detail modal) `70`, `Projects` (overlay) `99` — correctly above both. Screenshot confirms the panel renders fully visible on top (`docs/qa/results/STORY-022-evidence/bug007-fixed-projects-overlay-on-top-of-task-modal.png`). Beyond visibility, confirmed genuine interactivity in this stacked state: clicked a project row, which correctly pushed the Settings level while the Task Detail modal and Story slide-over remained open and unaffected underneath. Repeated for "Config" — same `z: 99` result, and "Dismiss" correctly closed only the Config overlay without disturbing the layers beneath.

The fix commit's diff (`git show --stat`) touched only `OverlayHost.tsx` (z-index values) and a `TopBar.tsx` doc-comment update — no other production code changed, so the rest of this pass's findings (Back/Dismiss, BUG-006 resolution via "Open in Task Manager", panel width, main-view persistence, cold-start logic) still hold without needing full re-execution.

BUG-007 marked `resolved`. All bugs on this story (BUG-001 through BUG-007) are now `resolved` or `wont-fix` (BUG-002 only).

## Final Outcome
**QA ✓ marked.** All test cases pass (or are disclosed coverage gaps consistent with prior QA judgment on this story — tc-008's cold-start scenario verified by code reading rather than destructive testing against the shared environment, and tc-012's full mobile/tablet breakpoint sweep not exhaustively re-run due to no viewport-resize tool being available this session). No open bugs remain.
