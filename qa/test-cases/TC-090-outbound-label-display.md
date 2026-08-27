---
id: TC-090
tags: @regression
story: STORY-018
status: Active
---

# TC-090: Task and story link badges show correct outbound labels

## Preconditions
- App is running at http://localhost:3000
- A project exists with `link_types` dictionary containing at least the keys `depends-on`, `created-by`, and `context`
- Task A and Task B exist in the same story
- Story X and Story Y exist in the same project
- Three outbound links exist (Task A → Task B, one per link_type: `depends-on`, `created-by`, `context`)
- Three outbound story links exist (Story X → Story Y, one per link_type)
- Browser viewport set to 1280px wide

## Steps
1. Open the Task Detail Modal for Task A
2. Locate the Links section and find the link badge for the `depends-on` outbound link
3. Note the text displayed in the link type badge
4. Find the link badge for the `created-by` outbound link — note the badge text
5. Find the link badge for the `context` outbound link — note the badge text
6. Close the modal
7. Open the slide-over for Story X
8. Locate the Links section and repeat observations for the three outbound story link badges

## Expected Result
- The `depends-on` outbound link badge shows the label "depends on" (not the raw slug "depends-on")
- The `created-by` outbound link badge shows the label "created by"
- The `context` outbound link badge shows the label "context"
- The same labels appear for the equivalent story link badges in the Story slide-over
- All badges are readable with no overflow or clipping
