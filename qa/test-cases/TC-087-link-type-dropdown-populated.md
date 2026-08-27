---
id: TC-087
tags: @regression
story: STORY-006
status: Active
---

# TC-087: Add link form — directional dropdown populated from project's effective link_types dictionary

## Preconditions
- App is running at http://localhost:3000
- A project exists with at least one custom `link_types` dictionary entry defined (e.g. in project settings)
- A story with at least two tasks exists in the project
- Browser viewport set to 1280px wide

## Steps
1. Open the Task Detail Modal for any task
2. Click "Add link" to open the Add link form
3. Open the directional link type dropdown

## Steps (also verify for story links):
4. Close the task modal, open a story's slide-over
5. Click "Add link" in the Links section
6. Open the directional link type dropdown in the story Add link form

## Expected Result
- The dropdown in both forms (task and story) is populated with directional options derived from the project's effective `link_types` dictionary entries
- Each dictionary key produces two options: one outbound label and one inbound label
- No raw dictionary key slugs (e.g. "depends-on") are visible — only human-readable labels
- No blank entries or placeholder values like "undefined" appear
- The dropdown is scrollable if there are many entries — no overflow clipping
- Selecting an entry highlights it clearly
