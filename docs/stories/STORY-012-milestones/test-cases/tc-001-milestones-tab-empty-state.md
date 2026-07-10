---
id: tc-001
tags: @smoke @regression
story: STORY-012
status: Active
---

# tc-001: Milestones tab — always present, empty state when no milestones

## Preconditions
- App is running at http://localhost:3000.
- At least one project exists.
- The selected project has no milestones.

## Steps
1. Navigate to a project (e.g. /projects/:id/stories).
2. Observe the sub-navigation tabs.
3. Verify a "Milestones" tab is present.
4. Click the "Milestones" tab.
5. Observe the content area.

## Expected Result
- The "Milestones" tab is always visible in the project sub-navigation regardless of whether any milestones exist.
- When no milestones exist for the project, the content area shows an empty state with an invitation to create the first milestone (e.g. a prompt or call-to-action button).
- No error screen or crash is shown.
