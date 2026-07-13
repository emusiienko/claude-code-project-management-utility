---
id: tc-003
tags: @regression
story: STORY-018
status: Active
---

# tc-003: Link badge falls back to raw link_type value for unknown types

## Preconditions
- App is running at http://localhost:3000
- A project exists with a custom `link_types` dictionary entry using a non-standard key, e.g. `blocks`
- Task A and Task B exist in the same story
- A link exists between Task A and Task B with link_type set to the custom key (e.g. `blocks`)
- Browser viewport set to 1280px wide

## Steps
1. Open the Task Detail Modal for Task A
2. Locate the Links section and find the badge for the link with the custom/unknown link_type
3. Note the text displayed in the type badge
4. Close Task A's modal
5. Open the Task Detail Modal for Task B
6. Locate the inbound link badge for the same link
7. Note the text displayed in the type badge

## Expected Result
- On Task A (outbound): the badge shows the raw link_type string (e.g. "blocks"), not an error, blank, or crash
- On Task B (inbound): the badge also shows the raw link_type string (graceful degradation — no distinct inbound label since the type is unknown)
- The app does not crash or show an error overlay
- The badge is readable and does not overflow or clip
