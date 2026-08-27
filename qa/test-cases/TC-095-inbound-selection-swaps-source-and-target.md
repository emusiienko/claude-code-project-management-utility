---
id: TC-095
tags: @regression
story: STORY-019
status: Active
---

# TC-095: Choosing an inbound label creates the link with source and target swapped

## Preconditions
- App is running at http://localhost:3000
- A project exists with `link_types` dictionary containing at least `depends-on`
- A story contains Task A and Task B
- The same project contains Story X and Story Y
- No existing links between these tasks or stories
- Browser viewport set to 1280px wide

## Steps
1. Open the Task Detail Modal for Task A
2. Click "Add link" to open the Add link form
3. Search for and select Task B as the other task
4. Open the link type dropdown and choose "dependent" (the inbound option for `depends-on`)
5. Submit the form
6. Observe the Links section on Task A's modal — note the new link row direction and badge
7. Close Task A's modal, then open the Task Detail Modal for Task B
8. Observe the Links section on Task B's modal — note the direction and badge
9. Close the task modal; open the slide-over for Story X
10. Click "Add link", search for Story Y, choose "dependent" (inbound), submit
11. Observe the new link row in Story X's Links section — note direction and badge
12. Close Story X's slide-over, open Story Y's slide-over
13. Observe the link row in Story Y's Links section — note direction and badge

## Expected Result
- Task A's modal shows the link to Task B with badge "dependent" and an inbound direction indicator — meaning Task B is the source and Task A is the target
- Task B's modal shows the same link with badge "depends on" and an outbound direction indicator — confirming the link was stored as Task B → Task A
- Story X's slide-over shows the link with badge "dependent" and inbound indicator (Story Y is the source)
- Story Y's slide-over shows the link with badge "depends on" and outbound indicator
- No error messages appear during or after submission
- The link appears correctly on both sides — it is not duplicated or missing from either view
