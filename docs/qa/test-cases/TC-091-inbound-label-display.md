---
id: TC-091
tags: @regression
story: STORY-018
status: Active
---

# TC-091: Task and story link badges show correct inbound labels

## Preconditions
- App is running at http://localhost:3000
- A project exists with `link_types` dictionary containing at least the keys `depends-on`, `created-by`, and `context`
- Task A and Task B exist in the same story
- Story X and Story Y exist in the same project
- Three outbound links have been created from Task A to Task B (one per link_type: `depends-on`, `created-by`, `context`) — these appear as inbound on Task B
- Three equivalent outbound story links have been created from Story X to Story Y — these appear as inbound on Story Y
- Browser viewport set to 1280px wide

## Steps
1. Open the Task Detail Modal for Task B (the target of the links)
2. Locate the Links section and find the inbound link badge for the `depends-on` link
3. Note the text displayed in the link type badge
4. Find the inbound badge for the `created-by` link — note the badge text
5. Find the inbound badge for the `context` link — note the badge text
6. Close the modal
7. Open the slide-over for Story Y (the target of the story links)
8. Repeat observations for the three inbound story link badges

## Expected Result
- The inbound `depends-on` link badge on Task B shows "dependent" (not "depends on" or the raw slug)
- The inbound `created-by` link badge on Task B shows "creates"
- The inbound `context` link badge on Task B shows "context for"
- The same inbound labels appear for the equivalent story link badges in the Story Y slide-over
- Inbound and outbound badges for the same link_type show different text (verifying direction-awareness)
- All badges are readable with no overflow or clipping
