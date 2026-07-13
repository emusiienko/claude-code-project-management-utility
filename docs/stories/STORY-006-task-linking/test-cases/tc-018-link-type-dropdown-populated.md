---
id: tc-018
tags: @regression
story: STORY-006
status: Active
---

# tc-018: Add link form — link_type dropdown is populated from the project's effective dictionary

## Preconditions
- App is running at http://localhost:3000
- A project exists with at least one custom `link_types` dictionary entry defined (e.g. in project settings)
- A story with at least two tasks exists in the project
- Browser viewport set to 1280px wide

## Steps
1. Open the Task Detail Modal for any task
2. Click "Add link" to open the Add link form
3. Open the `link_type` dropdown

## Steps (also verify for story links):
4. Close the task modal, open a story's slide-over
5. Click "Add link" in the Links section
6. Open the `link_type` dropdown in the story Add link form

## Expected Result
- The `link_type` dropdown in both forms (task and story) is populated with entries from the project's effective `link_types` dictionary
- The dropdown options match the dictionary entries (no blank entries, no placeholder values like "undefined")
- The dropdown is scrollable if there are many entries — no overflow clipping
- Selecting an entry highlights it clearly
