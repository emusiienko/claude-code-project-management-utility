---
id: tc-002
tags: @regression
story: STORY-019
status: Active
---

# tc-002: Choosing an outbound label creates the link with the current item as source

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
3. Search for and select Task B as the target
4. Open the link type dropdown and choose "depends on" (outbound option)
5. Submit the form
6. Observe the Links section on Task A's modal — note the new link row
7. Close Task A's modal, then open the Task Detail Modal for Task B
8. Observe the Links section on Task B's modal — note the link row
9. Close the task modal; open the slide-over for Story X
10. Click "Add link", search for Story Y, choose "depends on" (outbound), submit
11. Observe the new link row in Story X's Links section
12. Close Story X's slide-over, open Story Y's slide-over
13. Observe the link row in Story Y's Links section

## Expected Result
- Task A's modal shows the new link to Task B with badge "depends on" and an outbound direction indicator
- Task B's modal shows the same link with badge "dependent" and an inbound direction indicator (link appears from Task B's perspective as inbound)
- Story X's slide-over shows the link to Story Y with badge "depends on" and outbound indicator
- Story Y's slide-over shows the same link with badge "dependent" and inbound indicator
- No error messages appear during or after submission
