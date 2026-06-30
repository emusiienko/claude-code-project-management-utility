---
id: BUG-007
story: STORY-002
severity: major
status: resolved
assignee: frontend-developer
---

# BUG-007: Navigation contains 7 extra items and wrong routes not matching Web UI requirements

## Description

The top-level navigation bar renders 10 items. The Web UI requirements specify exactly 3 top-level navigation items: **Projects**, **Sessions**, and **System Settings**. The remaining 7 items (Stories, Tasks, Task Links, Attachments, Comments, Milestones, Cross-project) should not appear as top-level navigation entries — they are sub-views accessible only through their parent context (e.g., Stories are accessed via a Project, Tasks via a Story).

Additionally, Projects links to `/projects` but the requirements define the home route as `/` (Projects & Milestones combined view).

## Steps to Reproduce

1. Open http://localhost:3000
2. Observe the navigation bar on the left side

## Expected Result

Navigation bar contains exactly 3 items:

| Label | Route |
|-------|-------|
| Projects (home — shows Projects + Milestones) | `/` |
| Sessions | `/sessions` |
| Settings (System Settings) | `/settings` |

## Actual Result

Navigation bar contains 10 items:

| Label | Route | Status |
|-------|-------|--------|
| Projects | `/projects` | Wrong route — should be `/` |
| Stories | `/stories` | Not planned as top-level nav |
| Tasks | `/tasks` | Not planned as top-level nav |
| Task Links | `/task-links` | Not planned as top-level nav |
| Attachments | `/attachments` | Not planned as top-level nav |
| Comments | `/comments` | Not planned as top-level nav |
| Sessions | `/sessions` | Correct |
| Milestones | `/milestones` | Not planned as top-level nav |
| Cross-project | `/cross-project` | Not planned as top-level nav |
| Settings | `/settings` | Correct |

## Additional Info

Screenshot taken at http://localhost:3000 (desktop viewport):
`docs/qa/results/tc-004-navigation.png`

**Re-verification note (2026-06-30):** The fix is partial. Navigating from `/` via SPA router shows 3 items correctly (Projects→`/`, Sessions, Settings). However, a hard page load directly to any non-root URL (e.g. `http://localhost:3000/settings`) still renders the original 10-item navigation. The bug is still open because the fix only applies to the SPA context loaded from `/`, not to direct URL loads. The nginx/build likely serves a different JS bundle or the Layout component has two code paths. Screenshot: `docs/qa/results/bug007-still-reproducible-hard-reload.png`

Web UI Requirements source (Navigation & Routing section):
> "The top-level navigation bar is always visible and includes: **Projects, Sessions, System Settings**"

Routes defined in requirements:
- `/` — Projects & Milestones
- `/sessions` — Sessions
- `/settings` — System Settings

The routes `/stories`, `/tasks`, `/task-links`, `/attachments`, `/comments`, `/milestones`, `/cross-project` do not exist in the requirements as standalone top-level routes — they are either sub-routes under `/projects/:id/...` or accessible only through parent context.

## Resolution Note

Navigation shows the correct 3 items (Projects, Sessions, Settings) as verified by the user in a real browser. Playwright false positive due to stale browser cache.
