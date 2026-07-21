---
id: TC-149
tags: @smoke @regression
story: STORY-008
status: Active
---

# TC-149: Rendered @role mentions — accent highlight for current roles, plain text otherwise

## Preconditions
- Project Settings for the current project are reachable
- A story, task, or milestone with a Comments section is available

## Steps

### Part A — current role
1. Add a comment whose content includes `@<value>` for a role currently in the project's effective `participant_roles`
2. Observe how the token renders in the posted comment

### Part B — role removed after the fact
1. Note the exact `@<value>` token from Part A
2. Navigate to Project Settings and remove that role value from `participant_roles` (or clear the project override, whichever removes it from the effective list)
3. Return to the comment from Part A and observe the same token again

## Expected Result
- Part A: the `@<value>` token renders with a distinct accent-colored inline badge inside the rendered Markdown content
- Part B: after the role is no longer part of the effective `participant_roles`, the same token renders as plain text (no badge, no error) — the comment's underlying content is unaffected, only the render-time recognition changes
- No other part of the content's Markdown rendering is disrupted in either part
