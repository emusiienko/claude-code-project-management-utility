---
id: TC-104
tags: @smoke @regression
story: STORY-020
status: Active
---

# TC-104: Story slide-over shows outbound and inbound link labels from the API — not hardcoded

## Preconditions

- App is running at http://localhost:3000
- A project exists with at least two stories
- A story link exists between two stories using link type `depends-on`
- Viewport: 1280px

## Steps

1. Navigate to `/projects/:id/stories`
2. Open the slide-over for the source story (the one that "depends on" the other)
3. Scroll to the Links section in the slide-over
4. Observe the badge or label shown for the outbound link
5. Open the slide-over for the target story (the one that is "depended on")
6. Observe the badge or label shown for the inbound link

## Expected Result

- Source story slide-over: the link row shows the **outbound** label "depends on" for the `depends-on` link type
- Target story slide-over: the link row shows the **inbound** label "dependent" for the `depends-on` link type
- Labels match the values in the system settings `link_types` entries, not a hardcoded map
- No "undefined", "null", or raw slug is displayed

## Verification of API-driven labels

1. In `/settings`, change the Outbound label for `depends-on` to "STORY CUSTOM OUTBOUND" and Save
2. Open the source story slide-over again
3. The link badge now shows "STORY CUSTOM OUTBOUND"

## Cleanup

- Restore the outbound label to "depends on"
