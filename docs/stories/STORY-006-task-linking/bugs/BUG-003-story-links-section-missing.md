---
id: BUG-003
story: STORY-006
severity: critical
status: resolved
assignee: frontend-developer
---

# BUG-003: Story slide-over — Links section missing from right panel

## Description

The right panel of the Story slide-over has no "Links" section at all. The panel currently shows only: Description, Milestone, Attachments (placeholder), Comments (placeholder). No Links section with an "Add link" control exists anywhere in the slide-over. All 8 story-link test cases (tc-010 through tc-017) plus tc-018 and tc-020 are blocked by this issue.

## Steps to Reproduce

1. Navigate to http://localhost:3000
2. Open any project's Stories screen
3. Click a story row to open the Story slide-over
4. Examine the right panel ("Story details panel")

## Expected Result

- The right panel contains a "Links" section
- The section shows an empty state with an "Add link" control when no story links exist
- Clicking "Add link" opens a form to search for a target story in the same project and select a link type
- After adding a link, a row appears with a direction indicator (→), a link_type badge, and the linked story title as a clickable link

## Actual Result

The right panel contains:
- Description section
- Milestone section
- Attachments section (placeholder: "Attachments coming soon (STORY-007)")
- Comments section (placeholder: "Comments coming soon (STORY-008)")

There is no Links section. Story linking functionality is completely absent from the Story slide-over UI.

## Additional Info

Screenshots: `docs/qa/results/tc-010-story-links-placeholder.png`

Backend status: The backend API endpoints for story-links (POST/GET /v1/stories/{id}/links, DELETE /v1/story-links/{id}) return 404 — they are not registered in the router. This may indicate both frontend and backend implementations are missing for story links. Backend routes are outside manual-qa scope; this bug covers the frontend only.

Observed at: 2026-07-12 via Playwright browser test on http://localhost:3000
