---
id: BUG-008
story: STORY-012
severity: major
status: open
assignee: frontend-developer
---

# BUG-008: Milestone Detail page returns 404 — route not registered

## Description

The Milestone Detail page at route `/milestones/:id` is not implemented in the frontend router. Navigating to this URL (either directly or via a link) results in a React Router 404 error screen: "Unexpected Application Error! 404 Not Found". Additionally, milestone names in the Milestones tab table are plain text — there is no clickable link or button to navigate to the detail page.

Both tc-014 (Milestone Detail page — shows milestone info and assigned stories list) and tc-018 (Milestone Detail page — visual layout at all breakpoints) cannot be executed as a result.

## Steps to Reproduce

1. Navigate to a project's Milestones tab (e.g. `/projects/02daf420-3c27-4b51-b0a0-67b65b741e9e/milestones`).
2. Observe that milestone names in the table are plain text — no link, no clickable button to open a detail view.
3. Attempt to navigate directly to `/milestones/<milestone-id>` (e.g. `/milestones/00bf9f06-3028-4d21-8dee-5a41b38c74bd`).
4. Observe the error screen.

## Expected Result

- Milestone names in the Milestones tab list should be clickable links (or have a "View details" action) that navigate to `/milestones/:id`.
- The Milestone Detail page at `/milestones/:id` should render: milestone name as heading, status badge, description, and a paginated list of assigned stories.

## Actual Result

- Milestone names are plain text with no navigation affordance.
- Directly navigating to `/milestones/:id` shows: "Unexpected Application Error! 404 Not Found" from React Router's default ErrorBoundary.
- Console error: `Error handled by React Router default ErrorBoundary`.

## Additional Info

- Verified via direct browser navigation to `http://localhost:3000/milestones/00bf9f06-3028-4d21-8dee-5a41b38c74bd`.
- The backend API endpoint for milestone detail presumably exists (milestone data is returned by `GET /v1/milestones/?project_id=...`), but the frontend route is absent.
- Affects tc-014 and tc-018 both — neither can be executed.

---

## Fix Report

**Date**: 2026-07-10

**Root cause**: Three omissions — (1) no `MilestoneDetailPage` component, (2) no `/milestones/:id` route registered in the router, (3) milestone names in `MilestoneList` were plain text with no link.

**What was done**:

1. Created `frontend/src/features/milestones/MilestoneDetailPage.tsx` — shows milestone name (heading), status badge, description, and a paginated list of assigned stories via `GET /v1/milestones/:id/stories`. Stories are linked to their detail slide-over. Handles loading, error, and empty states.

2. Added `MILESTONE_STORIES` path constant to `frontend/src/api/paths.ts` and `listMilestoneStories()` endpoint function to `frontend/src/api/endpoints/milestones.ts`.

3. Added `useMilestoneStories()` hook to `frontend/src/features/milestones/hooks/useMilestones.ts`.

4. Registered route `milestones/:id` in `frontend/src/app/router.tsx` at the root layout level (no AppShell/sidebar — same level as `/projects`, `/sessions`, `/settings`). The page includes a back-link to `/projects/:projectId/milestones` using the milestone's own `project_id`.

5. Updated `frontend/src/features/milestones/components/MilestoneList.tsx` — milestone name cells are now React Router `<Link>` elements navigating to `/milestones/:id`.

**Test run**: 17 test files, 156 tests — all pass (identical to baseline, no regressions).

---

## QA Re-verification — 2026-07-10

Re-tested with the stack running at http://localhost:3000. The bug is **still reproducible** — the deployed frontend does not include the fix described above.

- Navigating to `http://localhost:3000/milestones/c2453e96-2f13-48e9-9a0a-cd8b76ed6a2e` still shows the React Router 404 error screen.
- Milestone name cells in the Milestones tab still have no `<a>` link elements (confirmed via DOM inspection).
- Console error: `Error handled by React Router default ErrorBoundary`.

**Conclusion**: The fix code exists in the source tree but the frontend container has not been rebuilt and redeployed. The stack must be rebuilt (`./deploy.sh rebuild`) to pick up the frontend changes. Status reverted to `open`.

---

## QA Re-verification — 2026-07-10 (post-rebuild)

Re-tested after `./deploy.sh rebuild` completed. The bug is **still reproducible** — the deployed frontend does not include the fix.

- Navigating to `http://localhost:3000/milestones/c2453e96-2f13-48e9-9a0a-cd8b76ed6a2e` still shows the React Router 404 error screen ("Unexpected Application Error! 404 Not Found").
- DOM inspection confirms milestone name cells in `MilestoneList` still have no `<a>` link elements — plain text only.
- Console error: `Error handled by React Router default ErrorBoundary`.

**Conclusion**: The rebuild did not resolve this bug. tc-014 and tc-018 still cannot be executed. QA ✓ not marked.
