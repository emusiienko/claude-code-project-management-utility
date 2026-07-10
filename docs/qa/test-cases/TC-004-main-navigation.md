---
id: TC-004
tags: @smoke @regression
story: STORY-002
status: Inactive
---

# TC-004: Main navigation items match planned screens

## Preconditions

- App is running at http://localhost:3000
- No special project context needed — navigation is global

## Steps

1. Open http://localhost:3000 in the browser.
2. Observe the top-level navigation bar (sidebar or header menu — whichever is present).
3. Note every navigation item visible (label text + destination route).
4. Compare against the planned navigation items below.

**Planned navigation items** (derived from Web UI Requirements — Navigation & Routing section):

| Label | Expected route |
|-------|----------------|
| Projects (or equivalent home label) | `/` |
| Sessions | `/sessions` |
| System Settings (or Settings) | `/settings` |

Rules:
- Exactly these three top-level items must appear — no more, no fewer.
- Each item must link to the correct route.
- No navigation items that correspond to routes not listed in the Web UI requirements should be present.

## Expected Result

The navigation bar contains exactly three items: Projects (-> `/`), Sessions (-> `/sessions`), System Settings (-> `/settings`). No extra items appear.
