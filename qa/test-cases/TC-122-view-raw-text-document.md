---
id: TC-122
tags: @regression
story: STORY-007
status: Active
---

# TC-122: Viewing a plain text / CSV / JSON document shows raw text in a scrollable block

## Preconditions
- App is running at http://localhost:3000
- A story has three document attachments: one with `mime_type: text/plain`, one uploaded as `.csv`, and one containing JSON content, each with multiple lines of content

## Steps
1. Click View on the plain text document row
2. Close the viewer; click View on the CSV document row
3. Close the viewer; click View on the JSON document row

## Expected Result
- For all three, the viewer modal opens and shows the raw content as-is (not rendered as formatted Markdown, not interpreted/parsed)
- The content is displayed in a scrollable block (e.g. a `<pre>`-style container) — long content scrolls within the modal rather than overflowing the page
- Line breaks and whitespace in the original content are preserved
- No console error appears while any of the three viewers are open
