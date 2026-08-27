---
id: TC-121
tags: @smoke @regression
story: STORY-007
status: Active
---

# TC-121: Viewing a Markdown document attachment opens the in-app viewer, rendered

## Preconditions
- App is running at http://localhost:3000
- A story has a "document" attachment with `mime_type: text/markdown`, containing at least a heading, a paragraph, and a list

## Steps
1. In the Attachments section, click the View action on the Markdown document row
2. Observe the viewer modal that opens

## Expected Result
- A viewer modal opens (not a new tab, not a raw download)
- The Markdown content is rendered as formatted HTML — the heading, paragraph, and list appear styled, not as raw `#`/`-` characters
- The modal has a visible close control and a title/heading identifying the attachment
- No console error appears while the viewer is open
