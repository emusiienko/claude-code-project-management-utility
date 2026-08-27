---
id: TC-105
tags: @smoke @regression
story: STORY-020
status: Active
---

# TC-105: Adding a task or story link — the directional picker populates from structured API data

## Preconditions

- App is running at http://localhost:3000
- A project exists with at least one story containing at least two tasks
- The project also has at least two stories
- Viewport: 1280px

## Steps — Task link picker

1. Navigate to the story slide-over for a story with multiple tasks
2. Open the Task Detail modal for any task
3. Click "Add link" (or equivalent) in the Links section
4. Observe the link type / direction dropdown

## Steps — Story link picker

1. Navigate to `/projects/:id/stories`
2. Open the slide-over for any story
3. Click "Add link" (or equivalent) in the story's Links section
4. Observe the link type / direction dropdown

## Expected Result (both pickers)

- The dropdown lists directional options derived from the four default `link_types` entries:
  - "depends on" (outbound for `depends-on`)
  - "dependent" (inbound for `depends-on`)
  - "dependent" (outbound for `dependent`)
  - "depends on" (inbound for `dependent`)
  - "created by" (outbound for `created-by`)
  - "creates" (inbound for `created-by`)
  - "creates" (outbound for `creates`)
  - "created by" (inbound for `creates`)
- The picker does not contain hardcoded options that differ from the API data
- Selecting one option and submitting the form creates the link; the badge displays the correct label

## Verification of API-driven picker

1. Add a new `link_types` entry in `/settings`: Value `blocks`, Outbound `blocks`, Inbound `blocked by`
2. Return to the Add link form
3. The new "blocks" / "blocked by" options appear in the picker without a page reload

## Cleanup

- Delete the `blocks` entry from settings
