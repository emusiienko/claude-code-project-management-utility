---
id: TC-103
tags: @smoke @regression
story: STORY-020
status: Active
---

# TC-103: Task Detail modal shows outbound and inbound link labels from the API — not hardcoded

## Preconditions

- App is running at http://localhost:3000
- A project exists with at least one story containing at least two tasks
- A task link exists between two tasks using link type `depends-on` (one task depends on another)
- Viewport: 1280px

## Steps

1. Navigate to the story's slide-over for the story that contains the linked tasks
2. Open the Task Detail modal for the source task (the one that "depends on" the other)
3. Locate the Links section in the Task Detail modal
4. Observe the badge or label shown for the outbound link (the link where this task is the source)
5. Open the Task Detail modal for the target task (the one that is "depended on")
6. Observe the badge or label shown for the inbound link (the link where this task is the target)

## Expected Result

- Source task detail: the link row for `depends-on` shows the **outbound** label: "depends on"
- Target task detail: the link row for `depends-on` shows the **inbound** label: "dependent"
- Labels match the values in the system settings `link_types` entries, not a hardcoded map
- No "undefined", "null", or raw slug is displayed instead of the label

## Verification of API-driven labels (separate check)

1. In `/settings`, edit the `depends-on` entry — change Outbound label to "CUSTOM OUTBOUND" and Save
2. Open the source task detail again
3. The link badge now shows "CUSTOM OUTBOUND" without any code change

## Cleanup

- Restore the outbound label to "depends on" after verification
