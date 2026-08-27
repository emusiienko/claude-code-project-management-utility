---
id: TC-106
tags: @regression
story: STORY-020
status: Active
---

# TC-106: A link whose type was deleted after creation shows the raw value — no crash

## Preconditions

- App is running at http://localhost:3000
- A project exists with a story containing at least two tasks
- A task link exists using a link type that will be removed (or add a custom one for this test)
- Viewport: 1280px

## Steps

1. In `/settings`, add a new `link_types` entry: Value `temp-link`, Outbound `linked to`, Inbound `linked from`
2. Navigate to a story's Task Detail modal and add a link between two tasks using `temp-link`
3. Confirm the link appears with label "linked to" or "linked from" as appropriate
4. Return to `/settings` and delete the `temp-link` entry; Save
5. Navigate back to the Task Detail modal for the task that had the link
6. Observe the link row

## Expected Result

- The link row still renders — the application does not crash, show a white screen, or display a JS error
- The link type badge shows the raw value string `temp-link` as a fallback (no label lookup was possible)
- The rest of the modal and task detail remains fully functional

## Cleanup

- Delete the task link created in this test
